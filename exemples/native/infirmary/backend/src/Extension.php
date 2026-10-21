<?php

namespace PolymorphExt\Infirmary;

use App\Domain\Scolarite\Models\Apprenant;
use App\Modules\ModuleSchedule;
use App\Modules\Native\NativeExtension;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;
use PolymorphExt\Infirmary\Commands\Summary;
use PolymorphExt\Infirmary\Models\Visit;
use PolymorphExt\Infirmary\Reports\VisitsSource;

/**
 * Infirmary: a complete native extension example. Identity, permissions, roles and tile come from the manifest;
 * this class adds what needs code.
 */
class Extension extends NativeExtension
{
    /** Reasons suggested on first install; the établissement edits them afterwards (Reasons screen). */
    public const REASONS = ['Maux de tête', 'Maux de ventre', 'Fièvre', 'Blessure légère', 'Malaise', 'Saignement de nez'];

    public function models(): array
    {
        return ['infirmary_visit' => Visit::class];
    }

    /** On every boot: the "infirmary visits" relation added to the core Apprenant model. */
    public function boot(): void
    {
        Apprenant::resolveRelationUsing('infirmaryVisits', fn (Apprenant $learner): HasMany => $learner->hasMany(Visit::class, 'learner_id'));
    }

    /** First install in an établissement, after the migrations. */
    public function install(): void
    {
        foreach (self::REASONS as $position => $label) {
            DB::table('infirmary_reasons')->insert(['label' => $label, 'position' => $position, 'created_at' => now(), 'updated_at' => now()]);
        }
    }

    /** A newer version was deployed: data upgrade depending on the version we come from. */
    public function upgrade(string $from): void
    {
        // Nothing for 1.0.0. Example: if (version_compare($from, '1.1.0', '<')) { … }
    }

    /** Before the purge: the activity log is not a table of the extension. */
    public function uninstall(): void
    {
        DB::table('activity_log')->where('log_name', 'infirmary')->delete();
    }

    /**
     * Every weekday evening, in each établissement where the extension is active: today's visits without the parent
     * informed. The « evening_reminder » setting (manifest) turns it off in an établissement.
     */
    public function schedule(ModuleSchedule $schedule): void
    {
        $schedule->task('parents-to-notify', function () {
            if (! $this->setting('evening_reminder')) {
                return;
            }
            $visits = Visit::query()->whereDate('occurred_at', today())->where('parent_informed', false)
                ->where('outcome', '!=', Visit::BACK_TO_CLASS)->pluck('id');
            if ($visits->isNotEmpty()) {
                activity('infirmary')->event('reminder')->withProperties(['visits' => $visits->all()])
                    ->log('Visites du jour sans parent prévenu');
            }
        })->weekdays()->at('17:30');
    }

    public function commands(): array
    {
        return [Summary::class];
    }

    public function reportSources(): array
    {
        return [VisitsSource::class];
    }
}
