"use client";

import { useContext } from "react";
import { LiffContext } from "@/components/LiffProvider";

export function useLiff() {
  const ctx = useContext(LiffContext);
  if (ctx === undefined) {
    throw new Error("useLiff must be used within <LiffProvider>");
  }
  return ctx;
}