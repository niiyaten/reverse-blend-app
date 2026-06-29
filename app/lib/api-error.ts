export function createErrorBody(error: string, detail?: string) {
  // 本番では外部APIやDBの詳細エラーを返さず、開発中だけ原因調査用に含める
  if (process.env.NODE_ENV === "development" && detail) {
    return { error, detail };
  }

  return { error };
}
