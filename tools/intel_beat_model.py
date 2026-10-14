"""Re-encode signed ConvInteger weights for the Intel ONNX CPU kernel.

The effective integer weight is unchanged: (w - z) == ((w + 128) - (z + 128)).
Only the four ConvInteger weight/zero-point bindings are replaced. Original
initializers, graph operations, scales, other consumers and source assets remain.
Schema: https://github.com/onnx/onnx/blob/v1.16.1/onnx/onnx.proto
"""
import hashlib
import json
from pathlib import Path
import sys


def varint(data, pos):
    value = shift = 0
    while True:
        byte = data[pos]
        pos += 1
        value |= (byte & 127) << shift
        if byte < 128:
            return value, pos
        shift += 7
        if shift > 63:
            raise ValueError('Invalid protobuf varint')


def encode_varint(value):
    out = bytearray()
    while value > 127:
        out.append((value & 127) | 128)
        value >>= 7
    out.append(value)
    return bytes(out)


def fields(data):
    pos = 0
    while pos < len(data):
        tag, pos = varint(data, pos)
        wire = tag & 7
        if wire == 0:
            value, pos = varint(data, pos)
        elif wire == 2:
            size, pos = varint(data, pos)
            value = data[pos:pos + size]
            if len(value) != size:
                raise ValueError('Truncated protobuf field')
            pos += size
        elif wire in (1, 5):
            size = 8 if wire == 1 else 4
            value = data[pos:pos + size]
            pos += size
        else:
            raise ValueError('Unsupported protobuf wire type')
        yield tag >> 3, wire, value


def message(entries):
    out = bytearray()
    for number, wire, value in entries:
        out += encode_varint((number << 3) | wire)
        if wire == 0:
            out += encode_varint(value)
        elif wire == 2:
            out += encode_varint(len(value)) + value
        else:
            out += value
    return bytes(out)


def one(entries, number):
    return next(value for field, wire, value in entries if field == number)


def tensor_bytes(entries):
    raw = [value for field, wire, value in entries if field == 9]
    if raw:
        return raw[0]
    values = []
    for field, wire, data in entries:
        if field != 5:
            continue
        if wire == 0:
            values.append(data & 255)
        else:
            pos = 0
            while pos < len(data):
                value, pos = varint(data, pos)
                values.append(value & 255)
    if not values:
        raise ValueError('Missing inline integer tensor data')
    return bytes(values)


def convert(data):
    model = list(fields(data))
    graph = list(fields(one(model, 7)))
    tensors = {one(list(fields(value)), 8): list(fields(value))
               for number, wire, value in graph if number == 5}
    nodes = [list(fields(value)) for number, wire, value in graph if number == 1]
    producers = {value: node for node in nodes for number, wire, value in node if number == 2}
    additions, replacements, clones = [], {}, {}
    count = 0

    def unsigned_clone(name):
        if name in clones:
            return clones[name]
        tensor = tensors[name]
        if one(tensor, 2) != 3:  # ONNX INT8
            raise ValueError('Expected signed INT8 ConvInteger tensor')
        renamed = name + b'__podium_u8_conv'
        if renamed in tensors:
            raise ValueError('Generated tensor name collision')
        original = tensor_bytes(tensor)
        shifted = bytes((value + 128) & 255 for value in original)
        clone = [entry for entry in tensor if entry[0] not in (2, 5, 8, 9)]
        clone += [(2, 0, 2), (8, 2, renamed), (9, 2, shifted)]  # ONNX UINT8
        additions.append((5, 2, message(clone)))
        clones[name] = renamed
        return renamed

    for node in nodes:
        if one(node, 4) != b'ConvInteger':
            continue
        inputs = [value for number, wire, value in node if number == 1]
        if len(inputs) != 4:
            raise ValueError('Unsupported ConvInteger input layout')
        producer = producers[inputs[0]]
        outputs = [value for number, wire, value in producer if number == 2]
        if one(producer, 4) != b'DynamicQuantizeLinear' or inputs[0] != outputs[0]:
            raise ValueError('Activation must be UINT8 from DynamicQuantizeLinear')
        weight, zero = tensor_bytes(tensors[inputs[1]]), tensor_bytes(tensors[inputs[3]])
        if len(zero) != 1:
            raise ValueError('Per-channel ConvInteger zero point is unsupported')
        signed_zero = zero[0] if zero[0] < 128 else zero[0] - 256
        unsigned_zero = (zero[0] + 128) & 255
        for value in weight:
            signed_weight = value if value < 128 else value - 256
            if signed_weight - signed_zero != ((value + 128) & 255) - unsigned_zero:
                raise ValueError('Effective weight changed')
        inputs[1], inputs[3] = unsigned_clone(inputs[1]), unsigned_clone(inputs[3])
        index = 0
        changed = []
        for number, wire, value in node:
            if number == 1:
                value = inputs[index]
                index += 1
            changed.append((number, wire, value))
        replacements[message(node)] = message(changed)
        count += 1
    if count != 4:
        raise ValueError('Upstream model changed: expected four ConvInteger nodes')
    transformed = [(number, wire, replacements.get(value, value) if number == 1 else value)
                   for number, wire, value in graph] + additions
    result = message([(number, wire, message(transformed) if number == 7 else value)
                      for number, wire, value in model])
    return result, count


if __name__ == '__main__':
    source, target = map(Path, sys.argv[1:3])
    original = source.read_bytes()
    result, count = convert(original)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(result)
    report = {'source_sha256': hashlib.sha256(original).hexdigest(),
              'derived_sha256': hashlib.sha256(result).hexdigest(),
              'converted_conv_nodes': count,
              'effective_integer_weights_unchanged': True}
    target.with_suffix('.provenance.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))
