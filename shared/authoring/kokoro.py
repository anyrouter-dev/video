# Voices lines with Kokoro-82M (Apache-2.0) through kokoro-onnx, one model load for every line.
# Reads [{"text", "voice", "speed", "lang", "out"}] as JSON on stdin and writes each line to its
# "out" as a 24 kHz mono WAV. Called by narrate.mjs; see its header for the setup.
import json, os, sys

import kokoro_onnx
import soundfile as sf
from kokoro_onnx.config import EspeakConfig

cache = os.path.expanduser("~/.cache/hyperframes/tts")
model = os.environ.get("KOKORO_MODEL", f"{cache}/models/kokoro-v1.0.onnx")
voices = os.environ.get("KOKORO_VOICES", f"{cache}/voices/voices-v1.0.bin")
# espeak-ng from the system: the wheel kokoro-onnx ships looks for its data in a path from its build machine
espeak = EspeakConfig(
    lib_path=os.environ.get("ESPEAK_LIB", "/opt/homebrew/lib/libespeak-ng.dylib"),
    data_path=os.environ.get("ESPEAK_DATA", "/opt/homebrew/share/espeak-ng-data"),
)
tts = kokoro_onnx.Kokoro(model, voices, espeak_config=espeak)

for line in json.load(sys.stdin):
    audio, rate = tts.create(line["text"], voice=line["voice"], speed=line["speed"], lang=line["lang"])
    sf.write(line["out"], audio, rate)
    print(json.dumps({"out": line["out"], "seconds": round(len(audio) / rate, 3)}), flush=True)
