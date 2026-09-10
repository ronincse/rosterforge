# Frozen-A comparison army replay — interrupted, 2026-09-10

**Result: failed/interrupted browser acceptance, not a completed army.**
Own tab9, ordinary `http://127.0.0.1:5242/app/`, temporary
`QA reference army frozen A`, current Supporting candidate based on42adbb7.
Immutable A `04c62fcd041b3808c39d5c46fd677c704027b979`; same hash-verified eight
files, normal file-picker import, new empty Army Roster. Historical comparison
input recovered from the retained audit's `rf-final-roster.txt`, not inferred from
its headline total. Required choices: Strike Force2000, Gladius, Priority Assets.

## Partial observed ledger

| Selected unit/loadout | Authored base | Observed adjustment/evidence | Evaluated points |
| --- | ---: | --- | ---: |
| Captain, default pistol/bolter/close combat, Warlord, Artificer Armour | 80 | selected Armour20 | 100 |
| Lieutenant, default pistol/bolter/close combat | 45 | none; Supporting not yet assigned | 45 |
| Intercessors5, sergeant power fist, 3 ordinary, 1 launcher | 80 | model count5; SET150 inactive | 80 |
| Intercessors10, sergeant power fist, 8 ordinary, 1 launcher | 80 | model count10; SET150 active | 150 |
| First Knights5, 4 maces, Great Weapon Master | 240 | preceding matching count0; SET260 inactive | 240 |

The last readable DOM sums to615 (100+45+80+150+240). The first Knights click
timed out, so its visible committed state is evidence, **not a successful action
acceptance**. Counts/conditional pricing are independently covered by passing A/B
engine and earlier browser tests; those do not repair this failed replay.

The nine remaining original army selections were not reached: two more Knights,
Hellblasters5, Assault Intercessors5, Heavy Intercessors5, Impulsor with missile
array/2storm bolters, Redemptor with heavy onslaught/heavy flamer/twin fragstorm,
Gladiator Lancer with two fragstorm launchers, and Whirlwind. Their completed
current-run ledger, final aggregate, Supporting and full-army save/reopen are
outstanding. No historical “missing90” correction or forced2000 was applied.

## Captured failure

At `2026-09-10T22:21:13.688Z`, clicking **Add Deathwing Knights** produced a CDP
`Input.dispatchMouseEvent` timeout. Browser console:

```text
DataCloneError: Failed to execute 'measure' on 'Performance':
Data cannot be cloned, out of memory.
  at logComponentRender (react-dom_client.js?v=6ad3c775:2469:803)
  at commitPassiveMountOnFiber (...:7616:124)
  at recursivelyTraversePassiveMountEffects (...:7606:5)
```

DOM still readable at615, five army selections, one known violation (missing
Supporting), incomplete structural checks. No crash interstitial was captured in
this run. The failed tab was not reloaded or retried; unaffected tests continued.

Lead and independent native source review identify the immediate throwing site:
React DOM19.2.8 development profiling flattens changed props into string-pair
timing detail, then `performance.measure` asks the browser to clone it during
passive commit. This is not evidence of persistence cloning raw roster bytes.
One oversized detail versus accumulated memory pressure remains unresolved.
Profiling does not require StrictMode; removing it would not remove this path.
Production lacks this particular development path, but no production rerun was
substituted for this acceptance failure. No causal fix is claimed, and this trace
does not retrospectively explain the older host-level crash.

Next bounded diagnostic: scalar component name/payload row/string-size and heap
measurements before React loads, delegating to native measure unchanged and
rethrowing failures. Do not retain full props, suppress errors, clear evidence,
or retry the failed army until a candidate repair has a demonstrated basis.
