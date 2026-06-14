import type { CSSProperties, ReactNode } from "react";

/** A 3D flip card: shows `front`, flips to `back` on hover/focus. Give it a
 *  fixed height (e.g. `h-48`) since the faces are absolutely positioned. */
export function FlipCard({
  front,
  back,
  className = "",
  style,
}: {
  front: ReactNode;
  back: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`flip ${className}`} style={style} tabIndex={0}>
      <div className="flip-inner">
        <div className="flip-face">{front}</div>
        <div className="flip-face flip-back">{back}</div>
      </div>
    </div>
  );
}
