import { utils } from "@/app/utils";

export function Pause(props: React.PropsWithoutRef<{ w: number, h: number,  c: string, f: string }>) {
  return (
    <svg xmlns={utils.constants.svgxmlns} width={props.w} height={props.h} viewBox="0 0 80 80">
      <path 
        fill={props.f}
        stroke={props.c}
        strokeWidth={2}
        d="M 12 2 C 18 0, 24 0, 30 2 L 30 78 C 24 80, 18 80, 12 78 L 12 2
           M 68 2 C 62 0, 56 0, 50 2 L 50 78 C 56 80, 62 80, 68 78 L 68 2"
      ></path>
    </svg>
  )
}