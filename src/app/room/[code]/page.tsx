import { RaidRoomClient } from "@/components/room/RaidRoomClient";

export default async function RoomCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return <RaidRoomClient code={code} />;
}
