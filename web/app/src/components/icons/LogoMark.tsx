/** Original Podium Air flat mark, using the shared app asset as a red mask. */
export function LogoMark({ size = 20, className }: { size?: number; className?: string }) {
  return <span aria-hidden="true" className={className} style={{
    display: 'inline-flex', flexShrink: 0, width: size, height: size,
    backgroundColor: '#fa233b',
    mask: `url(${import.meta.env.BASE_URL}logo-mark.png) center / contain no-repeat`,
    WebkitMask: `url(${import.meta.env.BASE_URL}logo-mark.png) center / contain no-repeat`,
  }} />;
}
