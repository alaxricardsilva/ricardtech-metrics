#!/usr/bin/env python3
import os
import re
import sys
import subprocess

DOC_ROOTS = [
    "/home/alaxricard/Documentos/Projetos",
    "/home/alaxricard/Documentos/APK",
    "/home/alaxricard/Documentos/ricard-infra-bot"
]

EXCLUDE_DIRS = [
    "/tools/flutter",
    "/local_data",
    "/node_modules",
    "/.tmp",
    "ricardtech-metrics"
]

DRY_RUN = "--dry-run" in sys.argv
DO_PUSH = "--push" in sys.argv

def get_git_repos():
    repos = []
    for root_dir in DOC_ROOTS:
        if not os.path.exists(root_dir):
            continue
        if os.path.isdir(os.path.join(root_dir, ".git")):
            repos.append(root_dir)
            continue
        for r, dirs, files in os.walk(root_dir):
            if any(ex in r for ex in EXCLUDE_DIRS):
                dirs[:] = []
                continue
            if ".git" in dirs:
                repos.append(r)
                dirs.remove(".git")
    return sorted(list(set(repos)))

def extract_repo_slug(repo_path):
    try:
        remotes = subprocess.check_output(
            ["git", "config", "--get-all", "remote.origin.url"],
            cwd=repo_path,
            text=True
        ).splitlines()
    except Exception:
        remotes = []

    slug = os.path.basename(repo_path).lower()
    for rem in remotes:
        m = re.search(r"/([^/]+?)(?:\.git)?$", rem.strip())
        if m:
            slug = m.group(1).lower()
            break
    return slug

def inject_badge(repo_path, slug):
    readme_candidates = []
    for item in os.listdir(repo_path):
        if re.match(r"^readme.*\.md$", item, re.IGNORECASE):
            readme_candidates.append(os.path.join(repo_path, item))
    if not readme_candidates:
        readme_candidates = [os.path.join(repo_path, "README.md")]

    any_changed = False
    badge_url = f"https://raw.githubusercontent.com/alaxricardsilva/ricardtech-metrics/main/charts/{slug}.svg"
    badge_block = (
        f"<!-- ricardtech-metrics:start -->\n"
        f'<p align="center">\n'
        f'  <a href="https://github.com/alaxricardsilva/ricardtech-metrics">\n'
        f'    <img src="{badge_url}" alt="Métricas do Repositório" />\n'
        f"  </a>\n"
        f"</p>\n"
        f"<!-- ricardtech-metrics:end -->"
    )

    for readme_path in readme_candidates:
        if not os.path.exists(readme_path):
            content = f"# {os.path.basename(repo_path)}\n\n"
        else:
            with open(readme_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

        if "ricardtech-metrics:start" in content:
            new_content = re.sub(
                r"<!-- ricardtech-metrics:start -->.*?<!-- ricardtech-metrics:end -->",
                badge_block,
                content,
                flags=re.DOTALL
            )
        elif badge_url in content:
            continue
        else:
            h1_match = re.search(r"^(#\s+[^\n]+\n)", content, flags=re.MULTILINE)
            if h1_match:
                idx = h1_match.end()
                new_content = content[:idx] + "\n" + badge_block + "\n" + content[idx:]
            else:
                new_content = badge_block + "\n\n" + content

        if new_content != content:
            any_changed = True
            if not DRY_RUN:
                with open(readme_path, "w", encoding="utf-8") as f:
                    f.write(new_content)

    if any_changed:
        return True, f"Atualizado README com badge ({slug})"
    return False, "Sem mudanças necessárias"

def main():
    repos = get_git_repos()
    print(f"🔍 Repositórios locais detectados: {len(repos)}")
    updated = []
    skipped = []

    for repo_path in repos:
        slug = extract_repo_slug(repo_path)
        changed, msg = inject_badge(repo_path, slug)
        if changed:
            updated.append((repo_path, slug))
            print(f"  [MODIFICADO] {slug} ({repo_path})")
            if not DRY_RUN:
                subprocess.run(["git", "add", "README.md"], cwd=repo_path, check=False)
                res = subprocess.run(
                    ["git", "commit", "-m", "docs: add ecosystem growth metrics badge [skip ci]"],
                    cwd=repo_path,
                    capture_output=True,
                    text=True
                )
                if DO_PUSH and res.returncode == 0:
                    print(f"  🚀 Enviando Triplo-Push para {slug}...")
                    subprocess.run(["git", "push", "origin"], cwd=repo_path, check=False)
        else:
            skipped.append((repo_path, slug, msg))

    print(f"\n📊 Resumo:")
    print(f"Total: {len(repos)} | Atualizados: {len(updated)} | Ignorados/Já presentes: {len(skipped)}")

if __name__ == "__main__":
    main()
