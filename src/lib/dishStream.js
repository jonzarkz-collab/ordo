// Pulls finished dish objects out of the model's JSON while it is still being
// written. The scan's output is one object, {"restaurant_name": ..., "dishes":
// [{...}, {...}]}, and each dish is complete long before the whole thing is.
// Shipping each dish the moment its closing brace arrives lets the diner watch
// the ranking build instead of staring at a spinner for 30 seconds.
//
// A tiny JSON-aware scanner, not a parser: it only tracks depth, strings and
// escapes, so feeding it text in arbitrary chunks (mid-string, mid-escape) is
// safe. It never throws; a dish that fails to parse is simply skipped, and the
// final full result still arrives as before.
export function dishScanner() {
  let text = "";
  let i = 0;
  let depth = 0;
  let inStr = false;
  let esc = false;
  let strStart = -1;
  let lastKey = "";
  let inDishes = false;
  let objStart = -1;

  return function feed(chunk) {
    text += chunk;
    const out = [];
    for (; i < text.length; i++) {
      const c = text[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === "\\") esc = true;
        else if (c === '"') {
          inStr = false;
          // At the root, the last string before a "[" is the array's key.
          if (depth === 1) lastKey = text.slice(strStart + 1, i);
        }
        continue;
      }
      if (c === '"') {
        inStr = true;
        strStart = i;
      } else if (c === "{" || c === "[") {
        depth++;
        if (c === "[" && depth === 2 && lastKey === "dishes") inDishes = true;
        if (c === "{" && inDishes && depth === 3) objStart = i;
      } else if (c === "}" || c === "]") {
        if (c === "}" && inDishes && depth === 3 && objStart >= 0) {
          try {
            out.push(JSON.parse(text.slice(objStart, i + 1)));
          } catch {
            /* malformed partial — the final payload still has it */
          }
          objStart = -1;
        }
        if (c === "]" && depth === 2) inDishes = false;
        depth--;
      }
    }
    return out;
  };
}
