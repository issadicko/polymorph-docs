<?php

namespace PolymorphExt\Infirmary\Http;

use App\Domain\Scolarite\Models\Apprenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use PolymorphExt\Infirmary\Models\Visit;

/** Infirmary visits: list over a period, visits of one learner, recording. */
class VisitController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate(['from' => ['nullable', 'date'], 'to' => ['nullable', 'date', 'after_or_equal:from']], [], [
            'from' => __('date de début'), 'to' => __('date de fin'),
        ]);

        return response()->json(Visit::query()->visibleTo($this->utilisateur())
            ->with('learner:id,matricule,nom,prenom')
            ->whereDate('occurred_at', '>=', $filters['from'] ?? today()->subDays(30))
            ->whereDate('occurred_at', '<=', $filters['to'] ?? today())
            ->orderByDesc('occurred_at')->limit(500)->get());
    }

    /** For the card of the learner's record: the number of visits and the five latest. */
    public function forLearner(Apprenant $learner): JsonResponse
    {
        $visits = Visit::query()->visibleTo($this->utilisateur())->where('learner_id', $learner->id);

        return response()->json([
            'total' => (clone $visits)->count(),
            'not_informed' => (clone $visits)->where('parent_informed', false)->count(),
            'latest' => $visits->orderByDesc('occurred_at')->limit(5)->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $visit = new Visit($this->validated($request));
        $visit->recorded_by = $this->utilisateur()->id;
        $visit->save();
        $this->log($visit, 'created', 'Visite à l\'infirmerie enregistrée');

        return response()->json($visit->load('learner:id,matricule,nom,prenom'), 201);
    }

    public function update(Request $request, Visit $visit): JsonResponse
    {
        $visit->update($this->validated($request));
        $this->log($visit, 'updated', 'Visite à l\'infirmerie modifiée');

        return response()->json($visit->load('learner:id,matricule,nom,prenom'));
    }

    public function destroy(Visit $visit): JsonResponse
    {
        $this->log($visit, 'deleted', 'Visite à l\'infirmerie supprimée');
        $visit->delete();

        return response()->json(null, 204);
    }

    /**
     * Field names are English; the error messages name them with the French labels below, translated by
     * backend/lang (« Le champ motif est obligatoire. »).
     *
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        return $request->validate([
            'learner_id' => ['required', 'integer', 'exists:apprenants,id'],
            'occurred_at' => ['required', 'date', 'before_or_equal:now'],
            'reason' => ['required', 'string', 'max:160'],
            'care' => ['nullable', 'string', 'max:2000'],
            'outcome' => ['required', Rule::in(Visit::OUTCOMES)],
            'parent_informed' => ['boolean'],
        ], [], [
            'learner_id' => __('apprenant'),
            'occurred_at' => __('date et heure'),
            'reason' => __('motif'),
            'care' => __('soins donnés'),
            'outcome' => __('orientation'),
            'parent_informed' => __('parent prévenu'),
        ]);
    }

    private function log(Visit $visit, string $event, string $description): void
    {
        activity('infirmary')->performedOn($visit)->causedBy($this->utilisateur())->event($event)
            ->withProperties(['learner_id' => $visit->learner_id])->log($description);
    }
}
