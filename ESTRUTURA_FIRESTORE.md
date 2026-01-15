# Estrutura de Dados - Firestore

## Collections

### 1. `concursos` (Rascunhos)
Dados temporários que o admin está editando/conferindo.

```
concursos/
  {concursoId}/
    - concurso: string (ex: "1229")
    - tipo: string ("programacao" | "resultado")
    - jogos: array
    - atualizado: timestamp
    - atualizadoPor: string (email)
    - status: string ("rascunho")
```

### 2. `concursos_publicados` (Públicos)
Dados que os usuários veem no site.

```
concursos_publicados/
  {concursoId}/
    - concurso: string
    - tipo: string
    - jogos: array
    - publicado: timestamp
    - publicadoPor: string (email)
    - status: string ("publicado")
```

### 3. `config` (Configurações)
Controla qual concurso está ativo.

```
config/
  atual/
    - concursoProgramacao: string (ex: "1229")
    - concursoResultado: string (ex: "1228")
    - ultimaAtualizacao: timestamp
```

## Fluxo de Dados

```
1. Admin cola dados → salva em `concursos/{id}` (rascunho)
2. Admin visualiza preview
3. Admin clica "PUBLICAR"
4. Dados copiados para `concursos_publicados/{id}`
5. `config/atual` atualizado com novo concurso ativo
6. Frontend carrega de `concursos_publicados` usando `config/atual`
```

## Regras de Segurança

```javascript
// Rascunhos - só admin escreve
match /concursos/{concursoId} {
  allow read: if isAdmin();
  allow write: if isAdmin();
}

// Publicados - todos leem, só admin escreve
match /concursos_publicados/{concursoId} {
  allow read: if true;
  allow write: if isAdmin();
}

// Config - todos leem, só admin escreve
match /config/{doc} {
  allow read: if true;
  allow write: if isAdmin();
}
```
