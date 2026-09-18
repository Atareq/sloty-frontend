# Shared release-tag helpers for Sloty frontend deployment.
# package.json "version" is not the release authority.

RELEASE_TAG_PATTERN='^v[0-9]+\.[0-9]+\.[0-9]+$'
COMMIT_SHA_PATTERN='^[0-9a-fA-F]{40}$'

validate_frontend_release_args() {
  local commit_sha="${1:-}"
  local release_tag="${2:-}"

  if [[ ! "$commit_sha" =~ $COMMIT_SHA_PATTERN ]]; then
    echo "Invalid commit SHA: expected exactly 40 hexadecimal characters." >&2
    return 1
  fi

  if [[ ! "$release_tag" =~ $RELEASE_TAG_PATTERN ]]; then
    echo "Invalid release tag: expected v<number>.<number>.<number>." >&2
    return 1
  fi
}

resolve_production_release_tag() {
  local sha="${1:?}"
  local existing_tag latest_tag version major minor patch

  existing_tag="$(
    git tag --points-at "$sha" --list 'v[0-9]*.[0-9]*.[0-9]*' \
      | sort -V \
      | tail -n 1
  )"
  if [[ -n "$existing_tag" ]]; then
    printf '%s\n' "$existing_tag"
    return 0
  fi

  latest_tag="$(
    git tag --list 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname \
      | head -n 1
  )"
  if [[ -z "$latest_tag" ]]; then
    printf '%s\n' "v0.1.0"
    return 0
  fi

  version="${latest_tag#v}"
  IFS='.' read -r major minor patch <<< "$version"
  printf 'v%s.%s.0\n' "$major" "$((minor + 1))"
}

release_tag_sha_status() {
  local release_tag="${1:?}"
  local commit_sha="${2:?}"
  local tag_sha

  if ! git rev-parse -q --verify "refs/tags/${release_tag}^{commit}" >/dev/null; then
    printf '%s\n' "missing"
    return 0
  fi

  tag_sha="$(git rev-list -n 1 "refs/tags/${release_tag}")"
  if [[ "$tag_sha" == "$commit_sha" ]]; then
    printf '%s\n' "match"
    return 0
  fi

  printf '%s\n' "conflict"
}
