"""Verify the adapter against the actual upstream asset, including untouched data."""
import hashlib
from pathlib import Path
import unittest

from intel_beat_model import convert, fields, message, one, tensor_bytes


class IntelModelTest(unittest.TestCase):
    def test_actual_model_preserves_graph_and_effective_weights(self):
        source = Path(__file__).resolve().parents[1] / 'app/src/main/assets/beat_this_int8.onnx'
        original = source.read_bytes()
        before = hashlib.sha256(original).digest()
        converted, count = convert(original)
        self.assertEqual(count, 4)
        self.assertEqual(convert(original)[0], converted, 'conversion must be deterministic')
        model, derived = list(fields(original)), list(fields(converted))
        self.assertEqual(message(model), original, 'protobuf round trip must be lossless')
        self.assertEqual([e for e in model if e[0] != 7], [e for e in derived if e[0] != 7])
        graph, changed = list(fields(one(model, 7))), list(fields(one(derived, 7)))
        tensors = {one(list(fields(v)), 8): list(fields(v)) for n, w, v in changed if n == 5}
        self.assertEqual([e for e in graph if e[0] != 1],
                         [e for e in changed[:len(graph)] if e[0] != 1])
        nodes = [v for n, w, v in graph if n == 1]
        new_nodes = [v for n, w, v in changed if n == 1]
        self.assertEqual(len(nodes), len(new_nodes))
        for old, new in zip(nodes, new_nodes):
            old_fields, new_fields = list(fields(old)), list(fields(new))
            if one(old_fields, 4) != b'ConvInteger':
                self.assertEqual(old, new)
                continue
            self.assertEqual([e for e in old_fields if e[0] != 1],
                             [e for e in new_fields if e[0] != 1])
            old_inputs = [v for n, w, v in old_fields if n == 1]
            new_inputs = [v for n, w, v in new_fields if n == 1]
            self.assertEqual(old_inputs[::2], new_inputs[::2])
            signed_w, signed_z = (tensor_bytes(tensors[old_inputs[i]]) for i in (1, 3))
            unsigned_w, unsigned_z = (tensor_bytes(tensors[new_inputs[i]]) for i in (1, 3))
            for i in (1, 3):
                self.assertEqual(one(tensors[new_inputs[i]], 2), 2)
            z = signed_z[0] if signed_z[0] < 128 else signed_z[0] - 256
            self.assertEqual([((w if w < 128 else w - 256) - z) for w in signed_w],
                             [w - unsigned_z[0] for w in unsigned_w])
        self.assertEqual(hashlib.sha256(source.read_bytes()).digest(), before)


if __name__ == '__main__':
    unittest.main()
