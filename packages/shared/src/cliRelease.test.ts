import { describe, expect, it } from "vite-plus/test";

import {
  CLI_RELEASE_BASE_URL_ENV,
  CLI_RELEASE_REPOSITORY_ENV,
  cliArchivePlatformKey,
  cliArchiveTarCommand,
  cliReleaseBaseUrl,
  cliReleaseDefaultBaseUrl,
  cliReleaseIndexPageUrl,
  cliReleaseRepository,
  newestCliReleaseVersion,
  parseChecksums,
} from "./cliRelease.ts";

describe("cliRelease", () => {
  it("maps Intel Macs to the darwin-x64 archive", () => {
    expect(cliArchivePlatformKey("darwin", "x64")).toBe("darwin-x64");
    expect(cliArchivePlatformKey("darwin", "arm64")).toBe("darwin-arm64");
  });

  it("reads releases from T3CODE_UPDATE_REPOSITORY when it names a repository", () => {
    expect(cliReleaseRepository({})).toBe("pingdotgg/t3code");
    expect(cliReleaseRepository({ [CLI_RELEASE_REPOSITORY_ENV]: " ChyuWei/t3code " })).toBe(
      "ChyuWei/t3code",
    );
    expect(cliReleaseRepository({ [CLI_RELEASE_REPOSITORY_ENV]: "not-a-repository" })).toBe(
      "pingdotgg/t3code",
    );
    expect(cliReleaseIndexPageUrl(2, "ChyuWei/t3code")).toBe(
      "https://api.github.com/repos/ChyuWei/t3code/releases?per_page=100&page=2",
    );
    expect(cliReleaseDefaultBaseUrl("ChyuWei/t3code")).toBe(
      "https://github.com/ChyuWei/t3code/releases/download",
    );
    expect(cliReleaseBaseUrl({})).toBe("https://github.com/pingdotgg/t3code/releases/download");
    expect(cliReleaseBaseUrl({ [CLI_RELEASE_REPOSITORY_ENV]: "ChyuWei/t3code" })).toBe(
      "https://github.com/ChyuWei/t3code/releases/download",
    );
    expect(
      cliReleaseBaseUrl({
        [CLI_RELEASE_REPOSITORY_ENV]: "ChyuWei/t3code",
        [CLI_RELEASE_BASE_URL_ENV]: " https://mirror.example.com/t3code ",
      }),
    ).toBe("https://mirror.example.com/t3code");
  });

  it("parses sha256sum output including binary-mode markers", () => {
    const checksums = parseChecksums(
      [
        `${"a".repeat(64)}  t3-1.2.3-linux-x64.tar.gz`,
        `${"B".repeat(64)} *t3-1.2.3-win32-x64.zip`,
        "not a checksum line",
        "",
      ].join("\n"),
    );
    expect(checksums.get("t3-1.2.3-linux-x64.tar.gz")).toBe("a".repeat(64));
    expect(checksums.get("t3-1.2.3-win32-x64.zip")).toBe("b".repeat(64));
    expect(checksums.size).toBe(2);
  });

  it("extracts with the System32 bsdtar on Windows and plain tar elsewhere", () => {
    expect(cliArchiveTarCommand("linux", {})).toBe("tar");
    expect(cliArchiveTarCommand("win32", { SystemRoot: "D:\\Win" })).toBe(
      "D:\\Win\\System32\\tar.exe",
    );
    expect(cliArchiveTarCommand("win32", {})).toBe("C:\\Windows\\System32\\tar.exe");
  });

  it("picks the newest non-draft release on the requested channel", () => {
    const releases = [
      { tag_name: "v1.2.4-preview.20260912.9", draft: true },
      { tag_name: "v1.2.4-preview.20260912.8" },
      { tag_name: "v1.2.4-nightly.20260912.7" },
      { tag_name: "desktop-preview" },
      { tag_name: "v1.2.3" },
      { tag_name: "v1.2.3-nightly.20260911.2" },
    ];
    expect(newestCliReleaseVersion(releases, "preview")).toBe("1.2.4-preview.20260912.8");
    expect(newestCliReleaseVersion(releases, "nightly")).toBe("1.2.4-nightly.20260912.7");
    expect(newestCliReleaseVersion(releases, "stable")).toBe("1.2.3");
    expect(newestCliReleaseVersion([{ tag_name: "v1.2.3" }], "preview")).toBeUndefined();
  });
});
