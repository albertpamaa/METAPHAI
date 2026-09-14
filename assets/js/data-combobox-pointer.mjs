export const TAP_DRAG_THRESHOLD=8;

export function bindPointerOptionSelection(list,select,{threshold=TAP_DRAG_THRESHOLD,now=Date.now}={}){
  let gesture=null,suppressClickUntil=0;
  const codeFrom=target=>target?.closest?.('[data-code]')?.dataset?.code||null;
  const pointerdown=event=>{
    const code=codeFrom(event.target);
    if(!code||(event.button!=null&&event.button!==0))return;
    gesture={id:event.pointerId,type:event.pointerType||'mouse',x:event.clientX,y:event.clientY,code,moved:false};
  };
  const pointermove=event=>{
    if(!gesture||event.pointerId!==gesture.id)return;
    if(Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>threshold)gesture.moved=true;
  };
  const pointerup=event=>{
    if(!gesture||event.pointerId!==gesture.id)return;
    const completed=gesture;gesture=null;
    if(completed.type==='mouse')return;
    suppressClickUntil=now()+750;
    if(!completed.moved)select(completed.code);
  };
  const pointercancel=event=>{
    if(!gesture||event.pointerId!==gesture.id)return;
    if(gesture.type!=='mouse')suppressClickUntil=now()+750;
    gesture=null;
  };
  const click=event=>{
    const code=codeFrom(event.target);
    if(!code)return;
    if(now()<suppressClickUntil&&event.pointerType!=='mouse'){
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    select(code);
  };
  list.addEventListener('pointerdown',pointerdown);
  list.addEventListener('pointermove',pointermove);
  list.addEventListener('pointerup',pointerup);
  list.addEventListener('pointercancel',pointercancel);
  list.addEventListener('click',click);
  return()=>{
    list.removeEventListener('pointerdown',pointerdown);
    list.removeEventListener('pointermove',pointermove);
    list.removeEventListener('pointerup',pointerup);
    list.removeEventListener('pointercancel',pointercancel);
    list.removeEventListener('click',click);
  };
}
