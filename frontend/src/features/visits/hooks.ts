"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { visitsApi } from "@/lib/api/visits";
import type { CreateVisitRequest, VisitListParams } from "@/lib/api/types";
import { visitKeys } from "./keys";

export function useVisits(params: VisitListParams) {
  return useQuery({
    queryKey: visitKeys.list(params),
    queryFn: () => visitsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateVisitRequest) => visitsApi.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: visitKeys.all }),
  });
}

export type VisitAction =
  | { type: "confirm"; id: string }
  | { type: "reject"; id: string; reason?: string }
  | { type: "reschedule"; id: string; proposedAt: string; note?: string }
  | { type: "accept-reschedule"; id: string }
  | { type: "cancel"; id: string; reason?: string }
  | { type: "complete"; id: string };

function runAction(action: VisitAction) {
  switch (action.type) {
    case "confirm":
      return visitsApi.confirm(action.id);
    case "reject":
      return visitsApi.reject(action.id, action.reason);
    case "reschedule":
      return visitsApi.reschedule(action.id, action.proposedAt, action.note);
    case "accept-reschedule":
      return visitsApi.acceptReschedule(action.id);
    case "cancel":
      return visitsApi.cancel(action.id, action.reason);
    case "complete":
      return visitsApi.complete(action.id);
  }
}

export function useVisitAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: runAction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: visitKeys.all }),
  });
}
