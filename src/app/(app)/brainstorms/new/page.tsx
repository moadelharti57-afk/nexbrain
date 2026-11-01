import { Suspense } from "react";
import { BrainstormWizard } from "@/components/brainstorm/wizard";
import { Loading, PageHeader } from "@/components/page-header";
import { pageUser } from "@/lib/auth/page";
import { userDefaultWeights } from "@/lib/preferences";

async function Wizard() {
  const user = await pageUser("/brainstorms/new");
  return <BrainstormWizard defaultWeights={await userDefaultWeights(user.id)} />;
}

export default function NewBrainstormPage() {
  return (
    <>
      <PageHeader
        eyebrow="Brainstorming"
        title="Nouveau brainstorming"
        hint="La saisie rapide suffit ; l'analyse avancée affine les résultats. Tous les champs ne sont pas obligatoires."
      />
      <Suspense fallback={<Loading />}>
        <Wizard />
      </Suspense>
    </>
  );
}
