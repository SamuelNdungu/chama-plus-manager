interface ErrorWithResponseData {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
  };
}

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === "object" && error !== null) {
    const withResponse = error as ErrorWithResponseData;
    const apiMessage = withResponse.response?.data?.message || withResponse.response?.data?.error;
    if (typeof apiMessage === "string" && apiMessage.trim()) {
      return apiMessage;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};
