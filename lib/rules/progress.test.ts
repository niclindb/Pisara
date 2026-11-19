import { describe, expect, it } from "vitest";
import { goDeeperSuggestions, prerequisiteNote, showManyTopicsNote, suggestTopic, topicProgress, type SuggestableTopic } from "./progress";

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

describe("suggestTopic", () => {
  const t = (id: string, over: Partial<SuggestableTopic> = {}): SuggestableTopic => ({
    id,
    parentId: null,
    categoryId: "science",
    pickable: true,
    interest: 0,
    progress: { read: 0, finished: false },
    prerequisiteNote: null,
    ...over,
  });

  it("prefers a sub-topic of a finished topic", () => {
    const topics = [
      t("stars", { interest: 3, progress: { read: 3, finished: true } }),
      t("planets"),
      t("holes", { parentId: "stars" }),
    ];
    expect(suggestTopic(topics)?.id).toBe("holes");
  });

  it("then a topic in the same category as one that's on, in tree order", () => {
    const topics = [t("art", { categoryId: "arts" }), t("stars", { interest: 3 }), t("planets"), t("moons")];
    expect(suggestTopic(topics)?.id).toBe("planets");
  });

  it("falls back to any topic that's off", () => {
    expect(suggestTopic([t("stars", { interest: 3 }), t("art", { categoryId: "arts" })])?.id).toBe("art");
  });

  it("skips topics that are on, read before, not pickable, or build on an unfinished topic", () => {
    const topics = [
      t("on", { interest: 2 }),
      t("tried", { progress: { read: 1, finished: false } }),
      t("heading", { pickable: false }),
      t("early", { prerequisiteNote: "This builds on Stars, which you haven't finished." }),
    ];
    expect(suggestTopic(topics)).toBeNull();
  });
});
