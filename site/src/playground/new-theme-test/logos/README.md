# House logos (local only)

Real logos are the organisations' trademarks, so they are **not committed** — everything in this
folder except this README is gitignored.

To see a house with its real logo in the playground and the theme lab, drop the file here under the
house's name. SVG is preferred; PNG works too (it is embedded as an image):

| File | Used by |
| --- | --- |
| `bbc.svg` / `bbc.png` | BBC News — the block logo in the footer, level with the source |
| `wwf.svg` / `wwf.png` | WWF — the panda, top-left above the headline |
| `sunlight.svg` / `sunlight.png` | Sunlight Foundation — top-right, opposite the headline |

Without a file the theme draws a labelled placeholder of the same size (or, for BBC, the word
“BBC”), so nothing breaks and the layout is the same. The node scripts (theme matrix, cases) always
use the placeholder, so their output does not depend on what is in this folder.
