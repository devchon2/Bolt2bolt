import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { analyzeAndOptimize } from "./analyzer";
import * as analysisModule from "./modules/analysis";
import * as optimizationsModule from "./optimizations";

// Nous vous recommandons d’installer une extension pour exécuter des tests vitest.

vi.mock("./modules/analysis", () => ({
  analyzePerformance: vi.fn(),
  analyzeSecurity: vi.fn(),
  analyzeComplexity: vi.fn(),
}));

vi.mock("./optimizations", () => ({
  applyOptimizations: vi.fn(),
}));

describe("analyzeAndOptimize", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (analysisModule.analyzePerformance as Mock).mockReturnValue(["perfIssue"]);
    (analysisModule.analyzeSecurity as Mock).mockReturnValue(["secFlaw"]);
    (analysisModule.analyzeComplexity as Mock).mockReturnValue(["complexityData"]);
  });

  it("should call analysis functions and pass their results to applyOptimizations", () => {
    analyzeAndOptimize();

    expect(analysisModule.analyzePerformance).toHaveBeenCalled();
    expect(analysisModule.analyzeSecurity).toHaveBeenCalled();
    expect(analysisModule.analyzeComplexity).toHaveBeenCalled();
    expect(optimizationsModule.applyOptimizations).toHaveBeenCalledWith(
      ["perfIssue"],
      ["secFlaw"],
      ["complexityData"]
    );
  });
});