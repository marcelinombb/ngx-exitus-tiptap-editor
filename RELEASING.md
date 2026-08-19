# Commits e Releases

Este projeto usa [Conventional Commits](https://www.conventionalcommits.org/), validados
automaticamente via Husky + commitlint, e [standard-version](https://github.com/conventional-changelog/standard-version)
para gerar changelog, bump de versão e tag de release.

## Fluxo de uso

1. **Commitar seguindo o padrão**

   ```bash
   npm run commit
   ```

   Abre um prompt interativo (commitizen) que monta a mensagem no formato correto
   (`feat:`, `fix:`, `chore:`, etc). O hook `commit-msg` rejeita qualquer commit fora
   do padrão Conventional Commits.

2. **Lançar uma versão**

   ```bash
   npm run release
   ```

   Analisa os commits desde a última tag, calcula a próxima versão (major/minor/patch),
   atualiza `projects/ngx-exitus-tiptap-editor/package.json`, gera o changelog em
   `projects/ngx-exitus-tiptap-editor/docs/CHANGELOG.md`, cria o commit de release e a tag.

   Para forçar um tipo específico de bump:

   ```bash
   npm run release:patch
   npm run release:minor
   npm run release:major
   ```

   Para simular sem alterar nada:

   ```bash
   npm run release:dry-run
   ```

3. **Publicar**

   ```bash
   git push --follow-tags origin <branch>
   npm run publish
   ```
