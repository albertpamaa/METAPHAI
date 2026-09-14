import assert from 'node:assert/strict';
import {bindPointerOptionSelection,TAP_DRAG_THRESHOLD} from '../assets/js/data-combobox-pointer.mjs';

class FakeList{
  constructor(){this.listeners=new Map()}
  addEventListener(type,listener){this.listeners.set(type,listener)}
  removeEventListener(type,listener){if(this.listeners.get(type)===listener)this.listeners.delete(type)}
  dispatch(type,values={}){
    let prevented=false,stopped=false;
    const target={dataset:{code:values.code||'ESP'},closest:selector=>selector==='[data-code]'?target:null};
    const event={pointerId:1,pointerType:'touch',button:0,clientX:20,clientY:20,detail:1,target,preventDefault:()=>{prevented=true},stopPropagation:()=>{stopped=true},...values};
    this.listeners.get(type)?.(event);
    return{prevented,stopped};
  }
}

assert.equal(TAP_DRAG_THRESHOLD,8);
const list=new FakeList(),selected=[];let clock=1000;
const unbind=bindPointerOptionSelection(list,code=>selected.push(code),{now:()=>clock});

list.dispatch('pointerdown');list.dispatch('pointerup');assert.deepEqual(selected,['ESP'],'tap táctil debe seleccionar');
const synthetic=list.dispatch('click');assert.equal(synthetic.prevented,true);assert.equal(synthetic.stopped,true);assert.deepEqual(selected,['ESP'],'click sintético no debe duplicar la selección');

clock+=1000;list.dispatch('pointerdown',{code:'DEU'});list.dispatch('pointermove',{code:'DEU',clientY:70});list.dispatch('pointerup',{code:'DEU',clientY:70});list.dispatch('click',{code:'DEU'});assert.deepEqual(selected,['ESP'],'drag de 50 px no debe seleccionar');

clock+=1000;list.dispatch('pointerdown',{code:'FRA'});list.dispatch('pointermove',{code:'FRA',clientX:22,clientY:22});list.dispatch('pointerup',{code:'FRA',clientX:22,clientY:22});assert.deepEqual(selected,['ESP','FRA'],'movimiento accidental menor de 8 px debe ser tap');

clock+=1000;list.dispatch('pointerdown',{code:'GIB',pointerType:'mouse'});list.dispatch('pointerup',{code:'GIB',pointerType:'mouse'});list.dispatch('click',{code:'GIB',pointerType:'mouse'});assert.deepEqual(selected,['ESP','FRA','GIB'],'click de ratón debe seleccionar una vez');

clock+=1000;list.dispatch('pointerdown',{code:'TUV'});list.dispatch('pointerup',{code:'TUV'});assert.equal(selected.at(-1),'TUV','TUV debe seguir siendo seleccionable');
unbind();assert.equal(list.listeners.size,0);
console.log('data-combobox-pointer: tap, umbral 8 px, drag, click sintético, ratón y GIB/TUV OK');
