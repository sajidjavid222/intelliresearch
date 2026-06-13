// A template re-mounts on every navigation (unlike layout), so the page-enter
// animation replays on each route change — a gentle glassy fade/blur transition.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
