---
name: clarify-requirements
description: Resolve material ambiguity before writing or changing a specification or implementation. Use when a request has multiple plausible behavioral interpretations, missing acceptance criteria, or unclear UX/API/data semantics.
user-invocable: false
---

<!-- Skill metadata: 仕様書や実装を作成・変更する前に、重要な曖昧さを解消する Skill です。 -->

# Clarify requirements
<!-- 要件を確認する -->

1. Identify only ambiguities that can materially change behavior, interfaces, data semantics, compatibility, security, acceptance criteria, or UX.
<!-- 1. 振る舞い、インターフェース、データの意味、互換性、セキュリティ、受け入れ条件、UX を実質的に変え得る曖昧さだけを特定します。 -->
2. Separate blockers from safe implementation details. Do not ask about safe details.
<!-- 2. 作業を止める曖昧さと、安全に決められる実装詳細を分けます。安全に決められる詳細については質問しません。 -->
3. Ask the minimum focused questions needed to unblock the specification; use concrete options/examples where useful.
<!-- 3. 仕様を確定するために必要な最小限の質問だけを行い、有用であれば具体的な選択肢や例を提示します。 -->
4. Do not implement ambiguous behavior until blockers are answered.
<!-- 4. 作業を止める曖昧さへの回答が得られるまで、その曖昧な振る舞いを実装しません。 -->
5. Record resolved decisions or explicit assumptions in the specification.
<!-- 5. 解決した判断や明示的な仮定を仕様書へ記録します。 -->
