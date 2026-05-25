// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderLanding, renderMessage } from "../../src/ui/screens";

describe("screens", () => {
  it("landing fires onStart when the button is clicked", () => {
    const root = document.createElement("div");
    const onStart = vi.fn();
    renderLanding(root, onStart);
    (root.querySelector("button") as HTMLElement).click();
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("message shows title and body, and fires onAction", () => {
    const root = document.createElement("div");
    const onAction = vi.fn();
    renderMessage(root, { title: "Nope", body: "Try again", actionLabel: "Retry", onAction });
    expect(root.textContent).toContain("Nope");
    expect(root.textContent).toContain("Try again");
    (root.querySelector("button") as HTMLElement).click();
    expect(onAction).toHaveBeenCalledOnce();
  });
});
