"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { verificationApi } from "@/lib/api/verification";
import type { DocumentType, VerificationDto } from "@/lib/api/types";
import { sessionStore } from "@/lib/auth/session-store";
import { verificationKeys } from "./keys";

export function useVerification() {
  return useQuery({ queryKey: verificationKeys.mine(), queryFn: verificationApi.get });
}

export function useVerificationMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: verificationKeys.all });

  const syncUserStatus = (verification: VerificationDto) => {
    const user = sessionStore.getState().user;
    if (user) sessionStore.setUser({ ...user, verificationStatus: verification.status });
  };

  const upload = useMutation({
    mutationFn: ({ file, documentType }: { file: File; documentType: DocumentType }) =>
      verificationApi.upload(file, documentType),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: verificationApi.remove, onSuccess: invalidate });
  const submit = useMutation({
    mutationFn: verificationApi.submit,
    onSuccess: (verification) => {
      queryClient.setQueryData(verificationKeys.mine(), verification);
      syncUserStatus(verification);
    },
  });
  return { upload, remove, submit };
}
