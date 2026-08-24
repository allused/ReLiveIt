export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) {
      return body.message.join(' ');
    }
    return body.message || 'Something went wrong.';
  } catch {
    return 'Something went wrong.';
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isForm = options.body instanceof FormData;
  const res = await fetch(`/api${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  });
  if (!res.ok) {
    throw new ApiError(res.status, await parseError(res));
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export function mediaUrl(photoId: string, variant: 'thumb' | 'medium' | 'original' = 'medium') {
  return `/api/media/${photoId}?variant=${variant}`;
}
