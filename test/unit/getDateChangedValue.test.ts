import { describe, it, expect } from "vitest";

import { getDateChangedValue } from "../../src/types/attributes/date";

const REF_DATE_TS = new Date("2023-11-29T15:54:43.192Z").getTime();

describe("Test Date update operations", () => {
  describe("Test timestamp", () => {
    it("should increase date by x year", () => {
      const $incr = 4;
      const newVal = getDateChangedValue("TIMESTAMP", { year: { $incr } });

      const updatedDate = new Date(REF_DATE_TS + newVal);

      expect(updatedDate).deep.eq(new Date("2027-11-28T20:21:23.192Z"));
    });

    it("should decrease date by x year", () => {
      const $decr = 9;
      const newVal = getDateChangedValue("TIMESTAMP", { year: { $decr } });

      const updatedDate = new Date(REF_DATE_TS + newVal);

      expect(updatedDate).deep.eq(new Date("2014-12-01T05:54:43.192Z"));
    });

    it("should increase date by x month", () => {
      const $incr = 1;
      const newVal = getDateChangedValue("TIMESTAMP", { month: { $incr } });

      const updatedDate = new Date(REF_DATE_TS + newVal);

      expect(updatedDate).deep.eq(new Date("2023-12-30T01:54:43.192Z"));
    });

    it("should decrease date by x month", () => {
      const $decr = 1;
      const newVal = getDateChangedValue("TIMESTAMP", { month: { $decr } });

      const updatedDate = new Date(REF_DATE_TS + newVal);

      expect(updatedDate).deep.eq(new Date("2023-10-30T05:54:43.192Z"));
    });

    it("should increase date by x day", () => {
      const $incr = 67;
      const newVal = getDateChangedValue("TIMESTAMP", { day: { $incr } });

      const updatedDate = new Date(REF_DATE_TS + newVal);

      expect(updatedDate).deep.eq(new Date("2024-02-04T15:54:43.192Z"));
    });

    it("should decrease date by x day", () => {
      const $decr = 104;
      const newVal = getDateChangedValue("TIMESTAMP", { day: { $decr } });

      const updatedDate = new Date(REF_DATE_TS + newVal);

      expect(updatedDate).deep.eq(new Date("2023-08-17T15:54:43.192Z"));
    });
  });

  describe("Test epoch", () => {
    it("should increase date by x year", () => {
      const $incr = 4;
      const newVal = getDateChangedValue("EPOCH", { year: { $incr } });

      const updatedDate = new Date(REF_DATE_TS + newVal * 1000);

      expect(updatedDate).deep.eq(new Date("2027-11-28T20:21:23.192Z"));
    });

    it("should decrease date by x year", () => {
      const $decr = 9;
      const newVal = getDateChangedValue("EPOCH", { year: { $decr } });

      const updatedDate = new Date(REF_DATE_TS + newVal * 1000);

      expect(updatedDate).deep.eq(new Date("2014-12-01T05:54:43.192Z"));
    });

    it("should increase date by x month", () => {
      const $incr = 1;
      const newVal = getDateChangedValue("EPOCH", { month: { $incr } });

      const updatedDate = new Date(REF_DATE_TS + newVal * 1000);

      expect(updatedDate).deep.eq(new Date("2023-12-30T01:54:43.192Z"));
    });

    it("should decrease date by x month", () => {
      const $decr = 1;
      const newVal = getDateChangedValue("EPOCH", { month: { $decr } });

      const updatedDate = new Date(REF_DATE_TS + newVal * 1000);

      expect(updatedDate).deep.eq(new Date("2023-10-30T05:54:43.192Z"));
    });

    it("should increase date by x day", () => {
      const $incr = 67;
      const newVal = getDateChangedValue("EPOCH", { day: { $incr } });

      const updatedDate = new Date(REF_DATE_TS + newVal * 1000);

      expect(updatedDate).deep.eq(new Date("2024-02-04T15:54:43.192Z"));
    });

    it("should decrease date by x day", () => {
      const $decr = 104;
      const newVal = getDateChangedValue("EPOCH", { day: { $decr } });

      const updatedDate = new Date(REF_DATE_TS + newVal * 1000);

      expect(updatedDate).deep.eq(new Date("2023-08-17T15:54:43.192Z"));
    });
  });

  describe("Test mixed $date operations", () => {
    it("should compute all operations sum", () => {
      // original date "2023-11-29T15:54:43.192Z"
      const newVal = getDateChangedValue("TIMESTAMP", {
        month: { $decr: 1 },
        year: { $incr: 2 },
        day: { $decr: 1 },
        hour: { $incr: 2 },
        minute: { $incr: 7 },
      });

      const updatedDate = new Date(REF_DATE_TS + newVal);

      expect(updatedDate).deep.eq(new Date("2025-10-28T10:15:03.192Z"));
    });
  });
});
