import { FileMetadata } from "../models/FileMetadata.js";

const SYNCTHING_ARTIFACT_NAMES = [
  ".stfolder",
  ".stignore",
  ".stversion",
  ".stversions",
];

export const isSyncthingArtifactName = (name: string): boolean =>
  SYNCTHING_ARTIFACT_NAMES.includes(name.toLowerCase());

export const findSyncthingArtifactIds = async (): Promise<string[]> => {
  const artifactRecords = await FileMetadata.find({
    name: { $in: SYNCTHING_ARTIFACT_NAMES },
  })
    .select({ driveId: 1 })
    .lean();

  const artifactIds = new Set(artifactRecords.map(({ driveId }) => driveId));
  let parentIds = Array.from(artifactIds);

  while (parentIds.length > 0) {
    const descendants = await FileMetadata.find({
      parents: { $in: parentIds },
    })
      .select({ driveId: 1 })
      .lean();

    parentIds = [];
    for (const { driveId } of descendants) {
      if (!artifactIds.has(driveId)) {
        artifactIds.add(driveId);
        parentIds.push(driveId);
      }
    }
  }

  return Array.from(artifactIds);
};
