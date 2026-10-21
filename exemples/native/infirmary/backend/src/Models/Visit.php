<?php

namespace PolymorphExt\Infirmary\Models;

use App\Domain\Identite\Models\User;
use App\Domain\Scolarite\Models\Apprenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Visit extends Model
{
    public const BACK_TO_CLASS = 'BACK_TO_CLASS';

    public const OUTCOMES = [self::BACK_TO_CLASS, 'SENT_HOME', 'DOCTOR'];

    protected $table = 'infirmary_visits';

    protected $fillable = ['learner_id', 'occurred_at', 'reason', 'care', 'outcome', 'parent_informed'];

    protected function casts(): array
    {
        return ['occurred_at' => 'datetime', 'parent_informed' => 'boolean'];
    }

    public function learner(): BelongsTo
    {
        return $this->belongsTo(Apprenant::class, 'learner_id');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    /** Visits of the learners the user can see: those enrolled in their centres, when the user is tied to centres. */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        $centres = $user->centreIds();

        return $centres === null ? $query
            : $query->whereHas('learner.inscriptions', fn (Builder $i) => $i->whereIn('centre_id', $centres));
    }
}
