<?php

namespace PolymorphExt\Infirmary\Http;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/** Reasons suggested when recording a visit (a plain list, without a model). */
class ReasonController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(DB::table('infirmary_reasons')->orderBy('position')->orderBy('label')->get(['id', 'label']));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['label' => ['required', 'string', 'max:160', Rule::unique('infirmary_reasons', 'label')]], [], ['label' => __('motif')]);
        $id = DB::table('infirmary_reasons')->insertGetId([
            'label' => $data['label'], 'position' => (int) DB::table('infirmary_reasons')->max('position') + 1,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        return response()->json(['id' => $id, 'label' => $data['label']], 201);
    }

    public function destroy(int $reason): JsonResponse
    {
        DB::table('infirmary_reasons')->where('id', $reason)->delete();

        return response()->json(null, 204);
    }
}
