<?php

namespace PolymorphExt\Infirmary\Reports;

use App\Domain\Identite\Models\User;
use App\Domain\Rapports\Sources\SourceRapport;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/** Infirmary visits, joined with the learner's enrolment of the day, for the custom reports. */
class VisitsSource extends SourceRapport
{
    public function code(): string
    {
        return 'infirmary_visits';
    }

    public function libelle(): string
    {
        return 'Visites à l\'infirmerie';
    }

    public function description(): string
    {
        return 'Une ligne par visite à l\'infirmerie, avec la classe et le centre de l\'inscription de l\'apprenant.';
    }

    public function permission(): string
    {
        return 'infirmary.view';
    }

    public function champs(): array
    {
        return [
            'date' => ['date', 'Date de la visite (AAAA-MM-JJ)'],
            'month' => ['texte', 'Mois de la visite (AAAA-MM)'],
            'time' => ['texte', 'Heure de la visite (HH:MM)'],
            'reason' => ['texte', 'Motif de la visite'],
            'outcome' => ['texte', 'BACK_TO_CLASS, SENT_HOME ou DOCTOR'],
            'parent_informed' => ['booleen', 'Le parent a été prévenu'],
            'registration_number' => ['texte', 'Matricule de l\'apprenant'],
            'learner' => ['texte', 'Nom et prénom'],
            'class' => ['texte', 'Code de la classe (inscription de la session)'],
            'centre' => ['texte', 'Centre'],
        ];
    }

    public function filtres(): array
    {
        return ['session_id', 'programme_id', 'centre_id', 'du', 'au'];
    }

    public function exemple(): string
    {
        return <<<'KODI'
            // Most frequent reasons, and how many visits did not inform the parent
            let byReason = groupBy(lignes, "reason")
            let table = []
            for (reason in keys(byReason)) {
              let rows = byReason[reason]
              let notInformed = size(filter(rows, fn(r) { return !r.parent_informed }))
              table = push(table, { reason: reason, visits: size(rows), parent_not_informed: notInformed })
            }
            return sortBy(table, "visits", "desc")
            KODI;
    }

    protected function requete(User $user, array $filtres): Builder
    {
        return DB::table('infirmary_visits as v')
            ->join('apprenants as a', 'a.id', '=', 'v.learner_id')
            ->join('inscriptions as i', 'i.apprenant_id', '=', 'a.id')
            ->join('sessions as s', 's.id', '=', 'i.session_id')
            ->leftJoin('classes as cl', 'cl.id', '=', 'i.classe_id')
            ->leftJoin('centres as c', 'c.id', '=', 'i.centre_id')
            ->whereIn('i.id', self::inscriptionsVisibles($user))
            ->whereRaw('v.occurred_at::date between s.date_debut and s.date_fin') // the enrolment of the session running that day
            ->when($filtres['session_id'] ?? null, fn (Builder $q, $id) => $q->where('i.session_id', $id))
            ->when($filtres['programme_id'] ?? null, fn (Builder $q, $id) => $q->where('s.programme_id', $id))
            ->when($filtres['centre_id'] ?? null, fn (Builder $q, $id) => $q->where('i.centre_id', $id))
            ->when($filtres['du'] ?? null, fn (Builder $q, $from) => $q->whereDate('v.occurred_at', '>=', $from))
            ->when($filtres['au'] ?? null, fn (Builder $q, $to) => $q->whereDate('v.occurred_at', '<=', $to))
            ->orderBy('v.occurred_at')->orderBy('v.id')
            ->select(['v.occurred_at', 'v.reason', 'v.outcome', 'v.parent_informed', 'a.matricule', 'a.nom', 'a.prenom', 'cl.code as class', 'c.nom as centre']);
    }

    protected function ligne(object $l): array
    {
        return [
            'date' => self::jour($l->occurred_at),
            'month' => self::mois($l->occurred_at),
            'time' => substr((string) $l->occurred_at, 11, 5),
            'reason' => $l->reason,
            'outcome' => $l->outcome,
            'parent_informed' => (bool) $l->parent_informed,
            'registration_number' => $l->matricule,
            'learner' => self::nomComplet($l->nom, $l->prenom),
            'class' => $l->class,
            'centre' => $l->centre,
        ];
    }
}
