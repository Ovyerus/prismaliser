export const shouldLoadAnalytics = (url: URL): boolean => {
  if (url.searchParams.has("code")) return false;

  const callback = new URLSearchParams(url.hash.slice(1));
  return !(
    callback.has("state") &&
    (callback.has("code") || callback.has("error"))
  );
};
