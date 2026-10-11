import { openAccount } from "./accounts.mjs";
import { stepGuide } from "./assist.mjs";

/**
 * The person at the node, as code that needs a person sees them: `ask` shows
 * one step and resolves with the value they typed into the panel (or
 * nothing), `confirm` shows a step they finish by clicking Done. The window
 * opens on `account` the first time a step is shown, and a step given `at`
 * first goes to that page. A value the person gives is typed into the
 * guide's panel, never read from the portal.
 */
export function assistedPerson({ account = "fastmail", notify = (message) => process.stderr.write(`${message}\n`) } = {}) {
  let opened = null, guide = null;
  const ready = async (at) => {
    if (!guide) {
      opened = await openAccount(account, { visible: true, notify });
      guide = await stepGuide(opened.context, { notify });
    }
    if (at) await opened.page.goto(at, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch((error) => notify(`could not open ${at}: ${error.message}; the step says where to go`));
    return guide;
  };
  return Object.freeze({
    async ask({ text, at = null, input, values = [] }) {
      return (await (await ready(at)).show(text, { values, input, labels: ["Done"] })).value;
    },
    async confirm(text, { at = null, values = [] } = {}) {
      await (await ready(at)).show(text, { values, labels: ["Done"] });
    },
    async close() {
      await opened?.close();
      opened = null; guide = null;
    },
  });
}
