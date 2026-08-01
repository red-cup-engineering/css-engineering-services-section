# html-services-section (web)

This is the **web-services-section** `html-services-section`: the home for HTML *rendering* packages, starting with `services/html-document-render-service`, which turns a carrier node tree plus resolved CSS into a complete HTML document string. It does not read or write HTML files, and it does not own the Semantic Hypertext Packet (SHP) codec.

A different `html-services-section` exists at `file-services-section/services/data-services-section/services/flatfile-services-section/services/serialization-services-section/services/html-services-section` — the file-format seat, home to `html-file-codec-service` and the SHP codec, lint, and escaping surface. If you are decoding or encoding HTML files, that is the section you want; if you are rendering a document from data, this is it.
