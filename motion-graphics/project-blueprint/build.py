import sys, base64, pathlib
SP = pathlib.Path(__file__).parent
audio = sys.argv[1] if len(sys.argv) > 1 else ''
out = sys.argv[2] if len(sys.argv) > 2 else str(SP/'index.html')
head = (SP/'src/head.html').read_text()
body = (SP/'src/body.html').read_text()
main = (SP/'src/main.js').read_text()
src = '__AUDIO_SRC__'
if audio:
    src = 'data:audio/mpeg;base64,' + base64.b64encode(pathlib.Path(audio).read_bytes()).decode()
body = body.replace('__AUDIO_SRC__', src)
html = head + '\n' + body + '\n<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>\n<script>\n' + main + '\n</script>\n'
pathlib.Path(out).write_text(html)
print(out, len(html)//1024, 'KB')
