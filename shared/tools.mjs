// Declarative two-anchor tools. Definitions never execute JavaScript on the host.
export function validateCustomTool(input){
  const fail=()=>{throw new Error('Invalid custom tool. Use a CustomTool: ID, name and 1–32 anchored primitives.');};
  const color=v=>typeof v==='string'&&v.length<=64&&/^(#[\da-f]{3,8}|(?:rgb|hsl)a?\([\d.,%+\-\s]+\)|[a-z]+)$/i.test(v);
  if(!input||typeof input!=='object'||!/^CustomTool:[a-z\d_-]{1,48}$/i.test(input.id)||typeof input.name!=='string'||!input.name.length||input.name.length>80||!Array.isArray(input.primitives)||!input.primitives.length||input.primitives.length>32)fail();
  const primitives=input.primitives.map(p=>{
    if(!p||!['line','rectangle','ellipse','horizontal','vertical','text'].includes(p.type)||![0,1].includes(p.from)||p.to!==undefined&&![0,1].includes(p.to)||['line','rectangle','ellipse'].includes(p.type)&&p.to===undefined||p.color!==undefined&&!color(p.color)||p.fill!==undefined&&!color(p.fill)||p.text!==undefined&&(typeof p.text!=='string'||p.text.length>80))fail();
    return {type:p.type,from:p.from,...(p.to!==undefined?{to:p.to}:{}),...(p.color!==undefined?{color:p.color}:{}),...(p.fill!==undefined?{fill:p.fill}:{}),...(p.text!==undefined?{text:p.text}:{})};
  });
  return {id:input.id,name:input.name,primitives};
}
