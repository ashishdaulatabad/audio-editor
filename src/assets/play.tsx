import { utils } from "@/app/utils";

export function Play(props: React.PropsWithoutRef<{ w: number, h: number,  c: string, f: string }>) {
  return (
    <svg xmlns={utils.constants.svgxmlns} width={props.w} height={props.h} viewBox="0 0 40 40">
      <path 
        fill={props.f}
        stroke={props.c} 
        d="M 2 4 C 3.5 3.5, 3.5 3.5, 4 4 L 36 18 C 38 19, 38 21, 36 22 L 4 36 C 2.5 36.5, 2.5 36.5, 2 36 L 2 4"
      ></path>
    </svg>
  )
}