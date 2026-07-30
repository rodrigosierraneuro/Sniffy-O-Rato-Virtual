#!/usr/bin/env python3
"""
Sniffy Virtual — Motor de Simulação Comportamental
Recriado por engenharia reversa a partir do Sniffy Pro 2.0

Uso:
  python main.py --config sniffy_custom/configs/default_rat.yaml
  python main.py --sdf "Sniffy O Rato Virtual/Sniffy Pro For Windows/Sample Files/VR-25.sdf"
  python main.py --config sniffy_custom/configs/custom_example.yaml --animate
  python main.py --parse-sdf "Sample Files/ShapeBP.sdf"
"""
import argparse
import sys
from pathlib import Path


def cmd_run(args):
    import numpy as np

    if args.sdf:
        from sniffy_custom.io.sdf_parser import SDFParser
        from sniffy_custom.io.config_loader import DEFAULT_BEHAVIORS
        from sniffy_custom.core.schedules import make_schedule
        from sniffy_custom.core.experiment import Experiment

        parser = SDFParser()
        sdf_path = Path(args.sdf)
        print(f"Carregando {sdf_path.name}...")
        sdf = parser.parse(sdf_path)
        print(parser.summarize(sdf))

        rng = np.random.default_rng(args.seed)
        schedule = make_schedule(sdf.schedule_type, sdf.schedule_param, rng)
        exp = Experiment(
            behaviors=DEFAULT_BEHAVIORS,
            schedule=schedule,
            target_behavior=sdf.target_behavior or "Bar Press",
            ticks_per_second=10,
            seed=args.seed,
            name=sdf_path.stem,
        )
    elif args.config:
        from sniffy_custom.io.config_loader import load_config
        print(f"Carregando config: {args.config}")
        exp = load_config(args.config)
    else:
        print("Use --sdf ou --config. Veja --help.")
        sys.exit(1)

    print(f"\nExperimento: {exp.name}")
    print(f"Esquema: {exp.schedule.name}")
    print(f"Comportamento alvo: {exp.target_behavior}")
    print(f"Ticks: {args.ticks}\n")

    if args.animate:
        try:
            from sniffy_custom.visualization.chamber_2d import ChamberWindow
            window = ChamberWindow(exp, ticks_per_frame=args.speed)
            window.run(max_ticks=args.ticks)
            result = type("R", (), {
                "events": list(window._events),
                "total_ticks": exp._tick,
                "ticks_per_second": exp.ticks_per_second,
                "total_responses": exp._cumulative_responses,
                "total_reinforcements": exp._cumulative_reinforcements,
                "to_dataframe": lambda self: None,
                "to_csv": lambda self, p: None,
            })()
        except Exception as e:
            print(f"Aviso: animação falhou ({e}). Executando modo headless.")
            args.animate = False

    if not args.animate:
        result = exp.run(max_ticks=args.ticks, progress_interval=args.ticks // 10)

    print(f"\n=== Resultado ===")
    print(f"Total de ticks: {result.total_ticks}")
    df = result.to_dataframe()
    from sniffy_custom.analysis.metrics import session_summary
    summary = session_summary(df, exp.target_behavior, exp.ticks_per_second)
    for k, v in summary.items():
        print(f"  {k}: {v}")

    if args.output:
        out = Path(args.output)
        out.mkdir(parents=True, exist_ok=True)
        csv_path = out / "session.csv"
        result.to_csv(str(csv_path))
        print(f"\nDados salvos em: {csv_path}")

        from sniffy_custom.analysis.plots import save_all
        print("Gerando gráficos...")
        save_all(df, str(out / "plots"), exp.target_behavior, exp.ticks_per_second)


def cmd_parse(args):
    from sniffy_custom.io.sdf_parser import SDFParser
    parser = SDFParser()
    for sdf_path in args.files:
        p = Path(sdf_path)
        print(f"\n{'='*50}")
        print(f"Arquivo: {p.name}")
        try:
            sdf = parser.parse(p)
            print(parser.summarize(sdf))
        except Exception as e:
            print(f"  ERRO: {e}")


def main():
    ap = argparse.ArgumentParser(description="Sniffy Virtual — Simulação Comportamental")
    sub = ap.add_subparsers(dest="command")

    run_p = sub.add_parser("run", help="Executar experimento")
    run_p.add_argument("--sdf", help="Arquivo .sdf original do Sniffy Pro")
    run_p.add_argument("--config", help="Arquivo de configuração YAML")
    run_p.add_argument("--ticks", type=int, default=36000, help="Duração em ticks (padrão: 36000 = 1h)")
    run_p.add_argument("--animate", action="store_true", help="Abrir janela 2D animada")
    run_p.add_argument("--speed", type=int, default=3, help="Ticks por frame (padrão: 3)")
    run_p.add_argument("--output", help="Diretório de saída para CSV e gráficos")
    run_p.add_argument("--seed", type=int, default=None, help="Semente aleatória")

    parse_p = sub.add_parser("parse", help="Inspecionar arquivo(s) .sdf")
    parse_p.add_argument("files", nargs="+", help="Arquivos .sdf para inspecionar")

    # Shortcuts: python main.py --config X  (sem subcomando)
    ap.add_argument("--config", help="Config YAML (atalho para 'run')")
    ap.add_argument("--sdf", help="Arquivo .sdf (atalho para 'run')")
    ap.add_argument("--ticks", type=int, default=36000)
    ap.add_argument("--animate", action="store_true")
    ap.add_argument("--speed", type=int, default=3)
    ap.add_argument("--output", "-o", default="data")
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--parse-sdf", dest="parse_sdf", nargs="+",
                    help="Inspecionar arquivos .sdf")

    args = ap.parse_args()

    if args.command == "run" or (not args.command and (args.config or args.sdf)):
        cmd_run(args)
    elif args.command == "parse" or (not args.command and args.parse_sdf):
        if args.command == "parse":
            cmd_parse(args)
        else:
            args.files = args.parse_sdf
            cmd_parse(args)
    else:
        ap.print_help()


if __name__ == "__main__":
    main()
