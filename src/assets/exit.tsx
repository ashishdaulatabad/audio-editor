import {SVGXMLNS} from '@/app/utils';

export function Exit(props: React.PropsWithoutRef<{
  w: number,
  h: number,
  fill: string
}>) {
  return (
    <svg xmlns={SVGXMLNS} width={props.w} height={props.h} viewBox="0 0 20 20">
      <path strokeWidth={5} stroke={props.fill} d="M 0 0 L 20 20 M 20 0 L 0 20"></path>
    </svg>
  )
}
