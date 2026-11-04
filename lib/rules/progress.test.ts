import { describe, expect, it } from "vitest";
import { goDeeperSuggestions, prerequisiteNote, showManyTopicsNote, topicProgress } from "./progress";

const lessons = [
  { id: "l1", level: 1 },
  { id: "l2", level: 1 },
  { id: "l3", level: 2 },
];

describe("topicProgress", () => {
  it("counts lessons read, with level as the highest level read", () => {
    expect(topicProgress(lessons, new Set(["l1", "l3"]))).toEqual({ read: 2, total: 3, level: 2, finished: false });
  });

  it("is finished when every published lesson is read", () => {
    expect(topicProgress(lessons, new Set(["l1", "l2", "l3"])).finished).toBe(true);
  });

  it("is not finished with no lessons", () => {
    expect(topicProgress([], new Set()).finished).toBe(false);
  });
});

describe("prerequisiteNote", () => {
  const unfinished = topicProgress(lessons, new Set(["l1"]));
  const finished = topicProgress(lessons, new Set(["l1", "l2", "l3"]));

  it("notes an unfinished parent", () => {
    expect(prerequisiteNote({ name: "Stars", progress: unfinished })).toBe(
      "This builds on Stars, which you haven't finished.",
    );
  });

  it("says nothing for a finished parent or a top-level topic", () => {
    expect(prerequisiteNote({ name: "Stars", progress: finished })).toBeNull();
    expect(prerequisiteNote(null)).toBeNull();
  });
});

describe("goDeeperSuggestions", () => {
  const children = [
    { id: "black-holes", pickable: true },
    { id: "pulsars", pickable: true },
    { id: "coming-soon", pickable: false },
  ];

  it("suggests pickable sub-topics not already on, once the topic is finished", () => {
    expect(goDeeperSuggestions(true, children, new Set(["pulsars"])).map((c) => c.id)).toEqual(["black-holes"]);
  });

  it("suggests nothing before the topic is finished", () => {
    expect(goDeeperSuggestions(false, children, new Set())).toEqual([]);
  });
});

describe("showManyTopicsNote", () => {
  it("shows above 8 topics", () => {
    expect(showManyTopicsNote(8)).toBe(false);
    expect(showManyTopicsNote(9)).toBe(true);
  });
});
