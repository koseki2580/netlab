# Sandbox Embed Host Example

This example shows the parent page side of a netlab sandbox iframe.

Run the dev server and open:

```bash
npm run dev
```

```text
http://localhost:5173/examples/embed/
```

The host page:

- builds an iframe URL with `buildSandboxEmbedUrl`
- passes `embedMode=compact`
- passes the current host origin as `parentOrigin`
- listens for sandbox child events and updates the progress panel

The parent listener still checks `event.origin`; child-side origin whitelisting
does not replace host-page validation.
