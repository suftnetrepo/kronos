import React from 'react';
import Svg,{Path,Circle,Rect,Line} from 'react-native-svg';
export type PremiumIconName='home'|'tasks'|'exam'|'more'|'plus'|'check'|'book'|'study'|'assignment'|'calendar'|'clock'|'chevron'|'close';
export function PremiumIcon({name,size=22,color='#111827',strokeWidth=1.9}:{name:PremiumIconName,size?:number,color?:string,strokeWidth?:number}){
 const p={stroke:color,strokeWidth,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
 return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
 {name==='home'&&<><Path d="M3.5 10.5 12 3.7l8.5 6.8v8.1a1.9 1.9 0 0 1-1.9 1.9H5.4a1.9 1.9 0 0 1-1.9-1.9z" {...p}/><Path d="M9 20.5v-6h6v6" {...p}/></>}
 {name==='tasks'&&<><Circle cx="12" cy="12" r="8.5" {...p}/><Path d="m8.4 12.2 2.2 2.2 5-5" {...p}/></>}
 {name==='exam'&&<><Path d="m3 9 9-4.5L21 9l-9 4.5z" {...p}/><Path d="M6.5 11v5.1c0 1.5 2.5 2.8 5.5 2.8s5.5-1.3 5.5-2.8V11M21 9v6" {...p}/></>}
 {name==='more'&&<><Line x1="5" y1="7" x2="19" y2="7" {...p}/><Line x1="5" y1="12" x2="19" y2="12" {...p}/><Line x1="5" y1="17" x2="19" y2="17" {...p}/></>}
 {name==='plus'&&<><Line x1="12" y1="5" x2="12" y2="19" {...p}/><Line x1="5" y1="12" x2="19" y2="12" {...p}/></>}
 {name==='check'&&<Path d="m5 12.5 4.2 4.2L19 7" {...p}/>} 
 {name==='book'&&<><Path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h12v16H7a2.5 2.5 0 0 0-2.5 2.5z" {...p}/><Path d="M4.5 5.5v16" {...p}/></>}
 {name==='study'&&<><Circle cx="12" cy="12" r="8.5" {...p}/><Path d="M9 9.5h6M9 12.5h6M9 15.5h3" {...p}/></>}
 {name==='assignment'&&<><Rect x="5" y="4" width="14" height="17" rx="2" {...p}/><Path d="M9 8h6M9 12h6M9 16h4" {...p}/></>}
 {name==='calendar'&&<><Rect x="4" y="5.5" width="16" height="15" rx="2.5" {...p}/><Line x1="8" y1="3.5" x2="8" y2="7.5" {...p}/><Line x1="16" y1="3.5" x2="16" y2="7.5" {...p}/><Line x1="4" y1="10" x2="20" y2="10" {...p}/></>}
 {name==='clock'&&<><Circle cx="12" cy="12" r="8.5" {...p}/><Path d="M12 7.5V12l3 2" {...p}/></>}
 {name==='chevron'&&<Path d="m9 5 7 7-7 7" {...p}/>} {name==='close'&&<><Line x1="7" y1="7" x2="17" y2="17" {...p}/><Line x1="17" y1="7" x2="7" y2="17" {...p}/></>}
 </Svg>
}
