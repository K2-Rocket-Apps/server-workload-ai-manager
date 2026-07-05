import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { appReducer, createInitialState } from "../state/reducer.js";
import { addUserMessage, addAssistantMessage } from "../state/actions.js";
import {
  selectApiOk,
  selectRunningVmCount,
  selectSlashMode,
  selectVisibleMessages,
} from "../state/selectors.js";

describe("app reducer", () => {
  it("creates initial state", () => {
    const s = createInitialState();
    assert.equal(s.tab, "chat");
    assert.equal(s.theme, "mistral");
    assert.equal(s.messages.length, 0);
  });

  it("adds messages", () => {
    let s = createInitialState();
    s = appReducer(s, addUserMessage("hello"));
    assert.equal(s.messages.length, 1);
    assert.equal(s.messages[0]!.role, "user");
  });

  it("clears chat", () => {
    let s = createInitialState();
    s = appReducer(s, addUserMessage("a"));
    s = appReducer(s, addAssistantMessage("b"));
    s = appReducer(s, { type: "CLEAR_CHAT" });
    assert.equal(s.messages.length, 0);
    assert.equal(s.chatHistory.length, 0);
  });

  it("cycles tabs", () => {
    let s = createInitialState();
    s = appReducer(s, { type: "NEXT_TAB" });
    assert.equal(s.tab, "dashboard");
  });

  it("sets theme", () => {
    let s = createInitialState();
    s = appReducer(s, { type: "SET_THEME", theme: "midnight" });
    assert.equal(s.theme, "midnight");
  });

  it("pushes input history without duplicates adjacent", () => {
    let s = createInitialState();
    s = appReducer(s, { type: "PUSH_INPUT_HISTORY", line: "hello" });
    s = appReducer(s, { type: "PUSH_INPUT_HISTORY", line: "hello" });
    assert.equal(s.inputHistory.length, 1);
  });
});

describe("selectors", () => {
  it("detects slash mode", () => {
    const s = { ...createInitialState(), input: "/model" };
    assert.equal(selectSlashMode(s), true);
  });

  it("counts running vms", () => {
    const s = {
      ...createInitialState(),
      vms: [
        { vmid: 1, name: "a", status: "running", node: "pve", guestAgent: true, issues: [] },
        { vmid: 2, name: "b", status: "stopped", node: "pve", guestAgent: false, issues: [] },
      ],
    };
    assert.equal(selectRunningVmCount(s), 1);
  });

  it("selects api status from config", () => {
    const s = {
      ...createInitialState(),
      configStatus: {
        model: "m",
        provider: "mistral",
        apiKeySet: true,
        pveHost: "h",
        pveNode: "pve",
        webUrl: "u",
        watchedVmids: [],
        emailEnabled: false,
        slackEnabled: false,
        temperature: 0.3,
        daemonIntervalMinutes: 15,
        daemonEnabled: true,
        checkCron: "0 7 * * *",
      },
    };
    assert.equal(selectApiOk(s), true);
  });

  it("slices visible messages", () => {
    let s = createInitialState();
    for (let i = 0; i < 20; i++) {
      s = appReducer(s, addUserMessage(`msg ${i}`));
    }
    const visible = selectVisibleMessages(s, 5);
    assert.equal(visible.length, 5);
  });
});
