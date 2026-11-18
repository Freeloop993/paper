export type ModelGraph = Record<string, {class_type:string; inputs:Record<string,unknown>; is_changed?:unknown}>;
type Output = { images?: {filename:string; type?:string}[] };

/** Validate the executed image branch, starting at each output recorded by ComfyUI. */
export function verifiedOutputNames(graph:ModelGraph, encoderId:string, outputs:Record<string,Output> | undefined,
  declaredOutputs?:unknown, requiredPrefix?:string):string[] {
  const names:string[]=[];
  function upstream(node:ModelGraph[string], input:string, expectedClass:string) {
    const edge=node.inputs[input];
    const target=Array.isArray(edge) && edge.length===2 && edge[1]===0 ? graph[String(edge[0])] : undefined;
    if(target?.class_type!==expectedClass) throw new Error('候选输出与本轮已核对的采样、解码链不一致。');
    return target;
  }
  for(const [key,output] of Object.entries(outputs??{})) {
    const images=(output.images??[]).filter(image=>image.type==='output');
    if(!images.length) continue;
    const save=graph[key];
    if(save?.class_type!=='SaveImage' || (requiredPrefix && save.inputs.filename_prefix!==requiredPrefix) ||
      (Array.isArray(declaredOutputs) && !declaredOutputs.some(value=>String(value)===key)))
      throw new Error('回图来自未登记为本轮候选的输出节点。');
    const decode=upstream(save,'images','VAEDecode');
    const sampler=upstream(decode,'samples','KSampler');
    for(const [input,index] of [['positive',0],['negative',1],['latent_image',2]] as const) {
      const edge=sampler.inputs[input];
      if(!Array.isArray(edge) || edge.length!==2 || String(edge[0])!==encoderId || edge[1]!==index)
        throw new Error('返回候选的采样器没有使用本轮已确认的文本与图像编码。');
    }
    names.push(...images.map(image=>image.filename));
  }
  return names;
}
