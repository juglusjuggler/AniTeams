import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth-utils";
import { getProfile } from "@/server/profile";
import { getAniListConnection, getAniListAuthUrl } from "@/server/anilist-sync";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileEditor } from "@/components/profile-editor";
import { AvatarEditor } from "@/components/avatar-editor";
import { AniListConnect } from "@/components/anilist-connect";
import { BookOpen, MessageSquare, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "My Profile",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const session = await requireAuth();
  const profile = await getProfile();
  const anilistConnection = await getAniListConnection();
  const anilistAuthUrl = await getAniListAuthUrl();

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-lg text-muted-foreground">Profile not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
        <AvatarEditor
          currentImage={profile.image ?? null}
          name={profile.name ?? null}
        />

        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center justify-center gap-2 md:justify-start">
            <h1 className="text-2xl font-bold">{profile.name ?? "Anonymous"}</h1>
            <Badge variant="outline">{profile.role}</Badge>
          </div>
          {profile.bio && (
            <p className="mt-2 text-sm text-muted-foreground">{profile.bio}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Joined {new Date(profile.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex flex-col items-center p-6">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="mt-2 text-2xl font-bold">{profile.stats.watchlist}</span>
            <span className="text-xs text-muted-foreground">Watchlist</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-6">
            <Clock className="h-6 w-6 text-primary" />
            <span className="mt-2 text-2xl font-bold">{profile.stats.progress}</span>
            <span className="text-xs text-muted-foreground">In Progress</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center p-6">
            <MessageSquare className="h-6 w-6 text-primary" />
            <span className="mt-2 text-2xl font-bold">{profile.stats.comments}</span>
            <span className="text-xs text-muted-foreground">Comments</span>
          </CardContent>
        </Card>
      </div>

      {/* Edit Profile */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileEditor
            currentName={profile.name ?? ""}
            currentBio={profile.bio ?? ""}
          />
        </CardContent>
      </Card>

      {/* AniList Connection */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>AniList Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <AniListConnect
            connection={anilistConnection ? {
              ...anilistConnection,
              lastSyncAt: anilistConnection.lastSyncAt?.toISOString() ?? null,
            } : null}
            authUrl={anilistAuthUrl}
          />
        </CardContent>
      </Card>
    </div>
  );
}
