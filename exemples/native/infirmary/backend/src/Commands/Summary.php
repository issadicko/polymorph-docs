<?php

namespace PolymorphExt\Infirmary\Commands;

use App\Modules\Modules;
use App\Plateforme\Etablissements;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/** Summary of the visits by reason, in each établissement where the extension is active. */
class Summary extends Command
{
    protected $signature = 'infirmary:summary {--from= : date de début (AAAA-MM-JJ, par défaut il y a 30 jours)} {--to= : date de fin (par défaut aujourd\'hui)}';

    protected $description = 'Bilan des visites à l\'infirmerie par motif';

    public function handle(Etablissements $etablissements, Modules $modules): int
    {
        $from = (string) ($this->option('from') ?: today()->subDays(30)->toDateString());
        $to = (string) ($this->option('to') ?: today()->toDateString());
        $etablissements->pourChaque(function ($etablissement) use ($modules, $from, $to) {
            if (! $modules->estActif('infirmary')) {
                return;
            }
            $this->info("{$etablissement->code} : du $from au $to");
            $this->table(['Motif', 'Visites', 'Parent non prévenu'], DB::table('infirmary_visits')
                ->whereDate('occurred_at', '>=', $from)->whereDate('occurred_at', '<=', $to)
                ->groupBy('reason')->orderByDesc('visits')
                ->selectRaw('reason, COUNT(*) as visits, SUM(CASE WHEN parent_informed THEN 0 ELSE 1 END) as not_informed')
                ->get()->map(fn ($row) => [$row->reason, $row->visits, $row->not_informed])->all());
        });

        return self::SUCCESS;
    }
}
