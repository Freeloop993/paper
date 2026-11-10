"""Offline interface test against the archived ComfyUI nodes.py; no weight loading."""
import argparse
import ast
import hashlib
import json
from pathlib import Path
from unittest.mock import Mock

PIN = "8c5a0239a4d3b9709085348a96d25184d28fa2267c2421b7f354614c03f3139c"

def verify(nodes_path):
    source = nodes_path.read_bytes()
    assert hashlib.sha256(source).hexdigest() == PIN
    tree = ast.parse(source)
    classes = {node.name:node for node in tree.body if isinstance(node,ast.ClassDef)}
    mappings = next(n.value for n in tree.body if isinstance(n,ast.Assign) and
                    any(isinstance(t,ast.Name) and t.id=="NODE_CLASS_MAPPINGS" for t in n.targets))
    for name in ("LoadImage","VAEEncode","KSampler"):
        assert any(isinstance(k,ast.Constant) and k.value==name and
                   isinstance(v,ast.Name) and v.id==name for k,v in zip(mappings.keys,mappings.values))
    # Only the two original node classes run here. Stubs are deliberately explicit.
    sampler_call = Mock()
    namespace = {"common_ksampler":sampler_call}
    fragment = ast.Module(body=[classes["VAEEncode"],classes["KSampler"]],type_ignores=[])
    exec(compile(fragment,str(nodes_path),"exec"),namespace)
    encoder = namespace["VAEEncode"]()
    assert encoder.INPUT_TYPES()["required"] == {"pixels":("IMAGE",),"vae":("VAE",)}
    assert encoder.RETURN_TYPES == ("LATENT",)
    image, token = object(), object()
    vae = Mock()
    vae.encode.return_value = token
    latent, = encoder.encode(vae,image)
    vae.encode.assert_called_once_with(image)
    assert latent["samples"] is token
    for variant in ("ii","iii","iv"):
        case = Path(__file__).resolve().parent/"requests"/("G3b-"+variant+".json")
        graph = json.loads(case.read_bytes())["prompt"]
        inputs = graph["10"]["inputs"]
        assert graph["16"] == {"class_type":"VAEEncode","inputs":{"pixels":["15",0],"vae":["3",0]}}
        assert inputs["latent_image"] == ["16",0]
        sampler = namespace["KSampler"]()
        sampler.sample(**{**inputs,"latent_image":latent})
        assert sampler_call.call_args.args[-1] is latent
        assert sampler_call.call_args.kwargs["denoise"] == inputs["denoise"]
    print("Pinned VAEEncode/KSampler interfaces and three image-start request paths verified (stub VAE and sampling function).")

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("nodes_py",type=Path)
    verify(p.parse_args().nodes_py)
