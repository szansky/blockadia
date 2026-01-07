import { useEffect, useState } from "react";
import GameCanvas from "./game/GameCanvas";
import { translations, Language } from "./i18n";

interface Resources {
  wood: number;
  stone: number;
  gold: number;
  metal: number;
}

const App = () => {
  const [resources, setResources] = useState<Resources>({
    wood: 0,
    stone: 0,
    gold: 0,
    metal: 0,
  });

  const [language, setLanguage] = useState<Language>("en");
  const t = translations[language];

  // State
  const [isBuildModalOpen, setIsBuildModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<{ type: string, quantity: number } | null>(null);
  const [isVillageModalOpen, setIsVillageModalOpen] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [villageLevel, setVillageLevel] = useState(1);
  const [villageType, setVillageType] = useState<string>("village");
  const [villagerCount, setVillagerCount] = useState(1);
  const [maxVillagerCount, setMaxVillagerCount] = useState(4); // Default base cap
  const [isRecruiting, setIsRecruiting] = useState(false);
  const [recruitProgress, setRecruitProgress] = useState(0);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeProgress, setUpgradeProgress] = useState(0);
  const [assignedVillagers, setAssignedVillagers] = useState(0);

  // Event Handlers
  const handleResourceUpdate = (e: CustomEvent<Resources>) => {
    setResources(e.detail);
  };

  const onPopulationUpdate = ((e: CustomEvent<{ current: number, max: number }>) => {
    setVillagerCount(e.detail.current);
    if (e.detail.max) setMaxVillagerCount(e.detail.max);
  }) as EventListener;

  const handleOpenVillage = ((e: CustomEvent<{ id: string, level: number, type?: string, isUpgrading: boolean, upgradeProgress: number, isRecruiting: boolean, recruitProgress: number, assignedVillagers?: number }>) => {
    setSelectedBuildingId(e.detail.id);
    setVillageLevel(e.detail.level);
    setVillageType(e.detail.type || "village");
    setIsUpgrading(e.detail.isUpgrading);
    setUpgradeProgress(e.detail.upgradeProgress);
    setIsRecruiting(e.detail.isRecruiting);
    setRecruitProgress(e.detail.recruitProgress);
    setAssignedVillagers(e.detail.assignedVillagers || 0);
    setIsVillageModalOpen(true);
  }) as EventListener;

  const handleBuildingUpdate = ((e: CustomEvent<{ id: string, level: number, isUpgrading: boolean, upgradeProgress: number, isRecruiting: boolean, recruitProgress: number, assignedVillagers?: number }>) => {
    // Only update if it matches the currently open building
    if (e.detail.id === selectedBuildingId) {
      setVillageLevel(e.detail.level);
      setIsUpgrading(e.detail.isUpgrading);
      setUpgradeProgress(e.detail.upgradeProgress);
      setIsRecruiting(e.detail.isRecruiting);
      setRecruitProgress(e.detail.recruitProgress);
      if (e.detail.assignedVillagers !== undefined) setAssignedVillagers(e.detail.assignedVillagers);
    }
  }) as EventListener;

  const handleResourceSelection = ((e: CustomEvent<{ type: string, quantity: number } | null>) => {
    setSelectedResource(e.detail);
  }) as EventListener;

  useEffect(() => {
    window.addEventListener("resourceUpdate", handleResourceUpdate as EventListener);
    window.addEventListener("populationUpdate", onPopulationUpdate);
    window.addEventListener("openVillageModal", handleOpenVillage);
    window.addEventListener("buildingUpdate", handleBuildingUpdate);
    window.addEventListener("resourceSelection", handleResourceSelection);

    return () => {
      window.removeEventListener("resourceUpdate", handleResourceUpdate as EventListener);
      window.removeEventListener("populationUpdate", onPopulationUpdate);
      window.removeEventListener("openVillageModal", handleOpenVillage);
      window.removeEventListener("buildingUpdate", handleBuildingUpdate);
      window.removeEventListener("resourceSelection", handleResourceSelection);
    };
  }, [selectedBuildingId]);

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    window.dispatchEvent(new CustomEvent("languageChange", { detail: lang }));
  };

  const handleUpgrade = () => {
    const cost = { wood: 200, stone: 100, gold: 50, metal: 0 };
    if (resources.wood < cost.wood || resources.stone < cost.stone || resources.gold < cost.gold) return;
    window.dispatchEvent(new CustomEvent("spendResources", { detail: cost }));

    // Request upgrade for selected building
    window.dispatchEvent(new CustomEvent("requestUpgrade", { detail: { id: selectedBuildingId } }));
  };

  const handleRecruit = () => {
    if (resources.gold >= 10 && villagerCount < 20) {
      window.dispatchEvent(new CustomEvent("spendResources", { detail: { wood: 0, stone: 0, gold: 10, metal: 0 } }));
      // Request recruit for selected building
      window.dispatchEvent(new CustomEvent("requestRecruit", { detail: { id: selectedBuildingId } }));
    }
  };

  const canAffordUpgrade = resources.wood >= 200 && resources.stone >= 100 && resources.gold >= 50;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-200 font-sans selection:bg-amber-500/30 relative">
      {/* Village Modal */}
      {/* Resource Inspector Panel */}
      {selectedResource && (
        <div className="absolute bottom-6 left-6 z-40 bg-slate-900/90 border-2 border-slate-700 rounded-xl p-4 shadow-2xl backdrop-blur-md w-64 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-600">
              <img
                src={`/assets/${selectedResource.type}.webp`}
                alt={selectedResource.type}
                className="w-8 h-8 object-contain"
                onError={(e) => (e.currentTarget.src = `/assets/${selectedResource.type}.png`)}
              />
            </div>
            <div>
              <h3 className="font-bold text-slate-200 capitalize text-lg">{selectedResource.type}</h3>
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Resource Node</span>
            </div>
          </div>

          <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800">
            <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Remaining</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-mono font-bold text-white">{selectedResource.quantity}</span>
              <span className="text-sm text-slate-500">/ 1000</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${selectedResource.quantity < 200 ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(100, (selectedResource.quantity / 1000) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}


      {/* Modals */}
      {isVillageModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          {villageType === "farm" ? (
            // Farm Modal
            <div className="w-[400px] rounded-2xl border-4 border-green-600 bg-slate-900 p-8 shadow-2xl relative overflow-hidden">
              <h2 className="text-3xl font-bold text-green-500 mb-8 text-center tracking-wider uppercase drop-shadow-sm font-serif">
                Farm
              </h2>

              <div className="flex flex-col items-center gap-6">
                <div className="w-32 h-32 bg-slate-900 rounded-lg border-4 border-slate-700 flex items-center justify-center shadow-inner overflow-hidden">
                  <img src="/assets/farm.png" alt="Farm" className="w-24 h-24 object-contain drop-shadow-lg" />
                </div>

                <div className="text-center space-y-4">
                  <p className="text-slate-300">Provides food for your growing village.</p>
                  <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 flex items-center justify-center gap-3">
                    <img src="/assets/villager.png" className="w-8 h-8" />
                    <span className="text-green-400 font-bold text-lg">+5 Max Population</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsVillageModalOpen(false)}
                  className="mt-4 w-full rounded-lg bg-slate-800/80 px-4 py-3 text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          ) : villageType === "barracks" ? (
            // Barracks Modal
            <div className="w-[400px] rounded-2xl border-4 border-slate-600 bg-slate-900 p-8 shadow-2xl relative overflow-hidden">
              <h2 className="text-3xl font-bold text-slate-400 mb-8 text-center tracking-wider uppercase drop-shadow-sm font-serif">
                Barracks
              </h2>

              <div className="flex flex-col items-center gap-6">
                <div className="w-32 h-32 bg-slate-900 rounded-lg border-4 border-slate-700 flex items-center justify-center shadow-inner overflow-hidden">
                  <img src="/assets/barracks.png" alt="Barracks" className="w-24 h-24 object-contain drop-shadow-lg" />
                </div>

                <div className="text-center space-y-4 w-full">
                  <p className="text-slate-300">Train soldiers to protect your village.</p>

                  <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800 w-full">
                    <span className="text-xs uppercase text-slate-500 font-bold block mb-2">Unit Cost</span>
                    <div className="flex justify-center gap-4">
                      <div className={`flex items-center gap-1 ${resources.gold < 10 ? 'text-red-400' : 'text-green-400'}`}>
                        <img src="/assets/gold.webp" className="w-4 h-4" alt="Gold" /> <span className="font-mono font-bold">10</span>
                      </div>
                      <div className={`flex items-center gap-1 ${resources.metal < 10 ? 'text-red-400' : 'text-green-400'}`}>
                        <img src="/assets/metal.webp" className="w-4 h-4" alt="Metal" /> <span className="font-mono font-bold">10</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("spendResources", { detail: { wood: 0, stone: 0, gold: 10, metal: 10 } }));
                      window.dispatchEvent(new CustomEvent("requestRecruit", { detail: { id: selectedBuildingId } }));
                    }}
                    disabled={resources.gold < 10 || resources.metal < 10 || isRecruiting}
                    className="w-full mt-2 py-3 rounded-lg bg-gradient-to-br from-red-800 to-red-900 text-white font-bold shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all border border-red-700"
                  >
                    {isRecruiting ? "Training..." : "Recruit Soldier"}
                  </button>

                  {isRecruiting && (
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-red-600 transition-all duration-100 ease-linear" style={{ width: `${recruitProgress}%` }}></div>
                    </div>
                  )}

                </div>

                <button
                  onClick={() => setIsVillageModalOpen(false)}
                  className="mt-4 w-full rounded-lg bg-slate-800/80 px-4 py-3 text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          ) : villageType.includes("mine") || villageType === "lumber_mill" ? (
            // Mines / Lumber Mill Modal
            <div className="w-[500px] rounded-2xl border-4 border-slate-600 bg-slate-900 p-8 shadow-2xl relative overflow-hidden">
              <h2 className="text-3xl font-bold text-slate-200 mb-8 text-center tracking-wider uppercase drop-shadow-sm font-serif">
                {villageType.replace("_", " ")}
              </h2>

              <div className="flex flex-col items-center gap-6">
                <div className="w-32 h-32 bg-slate-900 rounded-lg border-4 border-slate-700 flex items-center justify-center shadow-inner overflow-hidden">
                  <img src={`/assets/${villageType}.webp`} className="w-full h-full object-contain" onError={(e) => (e.currentTarget.src = `/assets/${villageType}.png`)} alt={villageType} />
                </div>

                <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800 w-full text-center">
                  <h3 className="text-lg font-bold text-slate-300 mb-2">Workforce</h3>
                  <p className="text-sm text-slate-500 mb-4">Assign villagers to work here. Each worker generates resouces automatically.</p>

                  <div className="flex items-center justify-center gap-8 mb-4">
                    <div className="text-center">
                      <span className="block text-4xl font-mono font-bold text-white">{assignedVillagers}</span>
                      <span className="text-xs text-slate-500 uppercase font-bold">Assigned</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-4xl font-mono font-bold text-slate-600">/</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-4xl font-mono font-bold text-slate-400">4</span>
                      <span className="text-xs text-slate-500 uppercase font-bold">Max</span>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent("assignVillager", { detail: { id: selectedBuildingId } }));
                      }}
                      disabled={assignedVillagers >= 4 || villagerCount <= 0} // Ideally check idle count
                      className="flex-1 py-2 rounded bg-green-700 hover:bg-green-600 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Assign Worker
                    </button>
                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent("unassignVillager", { detail: { id: selectedBuildingId } }));
                      }}
                      disabled={assignedVillagers <= 0}
                      className="flex-1 py-2 rounded bg-red-700 hover:bg-red-600 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Unassign
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setIsVillageModalOpen(false)}
                  className="mt-2 w-full rounded-lg bg-slate-800/80 px-4 py-3 text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          ) : villageType.includes("mine") || villageType === "lumber_mill" ? (
            // Mines / Lumber Mill Modal
            <div className="w-[500px] rounded-2xl border-4 border-slate-600 bg-slate-900 p-8 shadow-2xl relative overflow-hidden">
              <h2 className="text-3xl font-bold text-slate-200 mb-8 text-center tracking-wider uppercase drop-shadow-sm font-serif">
                {villageType.replace("_", " ")}
              </h2>

              <div className="flex flex-col items-center gap-6">
                <div className="w-32 h-32 bg-slate-900 rounded-lg border-4 border-slate-700 flex items-center justify-center shadow-inner overflow-hidden">
                  <img src={`/assets/${villageType}.webp`} className="w-full h-full object-contain" onError={(e) => (e.currentTarget.src = `/assets/${villageType}.png`)} alt={villageType} />
                </div>

                <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800 w-full text-center">
                  <h3 className="text-lg font-bold text-slate-300 mb-2">Workforce</h3>
                  <p className="text-sm text-slate-500 mb-4">Assign villagers to work here. Each worker generates resouces automatically.</p>

                  <div className="flex items-center justify-center gap-8 mb-4">
                    <div className="text-center">
                      <span className="block text-4xl font-mono font-bold text-white">{assignedVillagers}</span>
                      <span className="text-xs text-slate-500 uppercase font-bold">Assigned</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-4xl font-mono font-bold text-slate-600">/</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-4xl font-mono font-bold text-slate-400">4</span>
                      <span className="text-xs text-slate-500 uppercase font-bold">Max</span>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent("assignVillager", { detail: { id: selectedBuildingId } }));
                      }}
                      disabled={assignedVillagers >= 4 || villagerCount <= 0} // Ideally check idle count
                      className="flex-1 py-2 rounded bg-green-700 hover:bg-green-600 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Assign Worker
                    </button>
                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent("unassignVillager", { detail: { id: selectedBuildingId } }));
                      }}
                      disabled={assignedVillagers <= 0}
                      className="flex-1 py-2 rounded bg-red-700 hover:bg-red-600 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Unassign
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setIsVillageModalOpen(false)}
                  className="mt-2 w-full rounded-lg bg-slate-800/80 px-4 py-3 text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            // Village Modal (Existing)
            <div className="w-[850px] rounded-2xl border-4 border-amber-600 bg-slate-900 p-8 shadow-2xl relative overflow-hidden">
              <h2 className="text-3xl font-bold text-amber-500 mb-8 text-center tracking-wider uppercase drop-shadow-sm font-serif">
                {t.modalTitle} {villageLevel === 2 && "(Level 2)"}
              </h2>

              <div className="grid grid-cols-2 gap-8 relative z-10">
                {/* Upgrade Column */}
                <div className={`rounded-xl border-2 p-6 flex flex-col items-center gap-4 transition-all ${villageLevel >= 2 ? 'border-green-500/50 bg-green-900/10' : 'border-slate-700 bg-slate-800/50 hover:border-amber-500/50'}`}>
                  <h3 className="text-xl font-bold text-slate-200">{t.upgradeSectionTitle}</h3>
                  <div className="w-24 h-24 bg-slate-900 rounded-full border-4 border-slate-700 flex items-center justify-center shadow-inner overflow-hidden">
                    <img src="/assets/village_v2.png" alt="Upgrade" className="w-20 h-20 object-contain drop-shadow-lg" />
                  </div>

                  <div className="text-center space-y-2 w-full">
                    <p className="text-sm text-slate-400 h-10">{villageLevel >= 2 ? "Town Hall Completed" : t.upgradeDesc}</p>

                    {villageLevel < 2 && (
                      <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800 w-full">
                        <span className="text-xs uppercase text-slate-500 font-bold block mb-2">{t.upgradeCost}</span>
                        <div className="flex justify-center gap-4">
                          <div className={`flex items-center gap-1 ${resources.wood < 200 ? 'text-red-400' : 'text-green-400'}`}>
                            <img src="/assets/tree.webp" className="w-4 h-4" alt="Wood" /> <span className="font-mono font-bold">200</span>
                          </div>
                          <div className={`flex items-center gap-1 ${resources.stone < 100 ? 'text-red-400' : 'text-green-400'}`}>
                            <img src="/assets/stone.webp" className="w-4 h-4" alt="Stone" /> <span className="font-mono font-bold">100</span>
                          </div>
                          <div className={`flex items-center gap-1 ${resources.gold < 50 ? 'text-red-400' : 'text-green-400'}`}>
                            <img src="/assets/gold.webp" className="w-4 h-4" alt="Gold" /> <span className="font-mono font-bold">50</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {villageLevel < 2 ? (
                    <button
                      onClick={handleUpgrade}
                      disabled={!canAffordUpgrade || isUpgrading}
                      className="w-full mt-auto py-3 rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 text-white font-bold shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all"
                    >
                      {isUpgrading ? (
                        <div className="flex items-center justify-center gap-2">
                          <span className="animate-spin text-xl">⚙️</span> {t.building}
                        </div>
                      ) : t.upgradeBtn}
                    </button>
                  ) : (
                    <div className="w-full mt-auto py-3 rounded-lg bg-green-600/20 text-green-400 font-bold text-center border border-green-500/50">
                      ✅ Completed
                    </div>
                  )}

                  {isUpgrading && (
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 transition-all duration-100 ease-linear" style={{ width: `${upgradeProgress}%` }}></div>
                    </div>
                  )}
                </div>

                {/* Recruit Column */}
                <div className="rounded-xl border-2 border-slate-700 bg-slate-800/50 p-6 flex flex-col items-center gap-4 hover:border-blue-500/50 transition-all">
                  <h3 className="text-xl font-bold text-slate-200">{t.recruitTitle}</h3>

                  <div className="w-24 h-24 bg-slate-900 rounded-full border-4 border-slate-700 flex items-center justify-center shadow-inner relative">
                    <img src="/assets/villager.webp" alt="Villager" className="w-24 h-24 object-contain drop-shadow-lg" />
                    <div className="absolute -bottom-2 bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow border border-blue-400">
                      {villagerCount}/{maxVillagerCount}
                    </div>
                  </div>

                  <div className="text-center space-y-2 w-full">
                    <p className="text-sm text-slate-400 h-10">{t.recruitDesc}</p>
                    <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800 w-full">
                      <span className="text-xs uppercase text-slate-500 font-bold block mb-2">{t.cost}</span>
                      <div className="flex justify-center gap-4">
                        <div className={`flex items-center gap-1 ${resources.gold < 10 ? 'text-red-400' : 'text-green-400'}`}>
                          <img src="/assets/gold.webp" className="w-4 h-4" alt="Gold" /> <span className="font-mono font-bold">10</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleRecruit}
                    disabled={resources.gold < 10 || isRecruiting || villagerCount >= 20}
                    className="w-full mt-auto py-3 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white font-bold shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all"
                  >
                    {isRecruiting ? (
                      <div className="flex items-center justify-center gap-2">
                        <span className="animate-spin text-xl">⚔️</span> {t.training}
                      </div>
                    ) : villagerCount >= maxVillagerCount ? "Population Full" : t.recruitBtn}
                  </button>

                  {isRecruiting && (
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-100 ease-linear" style={{ width: `${recruitProgress}%` }}></div>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setIsVillageModalOpen(false)}
                className="mt-8 w-full rounded-lg bg-slate-800/80 px-4 py-3 text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700"
              >
                {t.cancelBtn}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Build Modal */}
      {
        isBuildModalOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setIsBuildModalOpen(false)}>
            <div className="bg-slate-900 border-2 border-slate-700 rounded-xl p-4 flex gap-4 shadow-2xl" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => {
                  setIsBuildModalOpen(false);
                  window.dispatchEvent(new CustomEvent("spendResources", { detail: { wood: 100, stone: 100, gold: 50, metal: 10 } }));
                  window.dispatchEvent(new CustomEvent("enterBuildMode", { detail: "village_v2" }));
                }}
                disabled={resources.wood < 100 || resources.stone < 100 || resources.gold < 50 || resources.metal < 10}
                className="flex flex-col items-center gap-2 p-4 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-600 hover:border-amber-500 disabled:opacity-50 disabled:grayscale"
              >
                <div className="w-16 h-16 bg-slate-900 rounded flex items-center justify-center overflow-hidden border border-slate-700">
                  <img src="/assets/village.webp" className="w-full h-full object-contain" alt="Village" />
                </div>
                <span className="text-sm font-bold text-slate-200">Village</span>
                <span className="text-[10px] text-slate-400">10s Build Time</span>
                <span className="text-[10px] text-slate-400">Allows Recruiting</span>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1 bg-slate-900/50 p-2 rounded border border-slate-700 w-full">
                  <div className={`flex items-center gap-1 text-[10px] ${resources.wood < 100 ? "text-red-400" : "text-green-400"}`}>
                    <img src="/assets/tree.webp" className="w-3 h-3" alt="Wood" /> 100
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] ${resources.stone < 100 ? "text-red-400" : "text-slate-500"}`}>
                    <img src="/assets/stone.webp" className="w-3 h-3" alt="Stone" /> 100
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] ${resources.gold < 50 ? "text-red-400" : "text-green-400"}`}>
                    <img src="/assets/gold.webp" className="w-3 h-3" alt="Gold" /> 50
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] ${resources.metal < 10 ? "text-red-400" : "text-slate-500"}`}>
                    <img src="/assets/metal.webp" className="w-3 h-3" alt="Metal" /> 10
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsBuildModalOpen(false);
                  window.dispatchEvent(new CustomEvent("spendResources", { detail: { wood: 50, stone: 0, gold: 50, metal: 0 } }));
                  window.dispatchEvent(new CustomEvent("enterBuildMode", { detail: "farm" }));
                }}
                disabled={resources.wood < 50 || resources.gold < 50}
                className="flex flex-col items-center gap-2 p-4 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-600 hover:border-amber-500 disabled:opacity-50 disabled:grayscale"
              >
                <div className="w-16 h-16 bg-slate-900 rounded flex items-center justify-center overflow-hidden border border-slate-700">
                  <img src="/assets/farm.png" className="w-full h-full object-contain" alt="Farm" />
                </div>
                <span className="text-sm font-bold text-slate-200">Farm</span>
                <span className="text-[10px] text-slate-400">7s Build Time</span>
                <span className="text-[10px] text-slate-400">+5 Max Pop</span>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1 bg-slate-900/50 p-2 rounded border border-slate-700 w-full">
                  <div className={`flex items-center gap-1 text-[10px] ${resources.wood < 50 ? "text-red-400" : "text-green-400"}`}>
                    <img src="/assets/tree.webp" className="w-3 h-3" alt="Wood" /> 50
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] ${resources.stone < 0 ? "text-red-400" : "text-slate-500"}`}>
                    <img src="/assets/stone.webp" className="w-3 h-3 grayscale opacity-50" alt="Stone" /> 0
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] ${resources.gold < 50 ? "text-red-400" : "text-green-400"}`}>
                    <img src="/assets/gold.webp" className="w-3 h-3" alt="Gold" /> 50
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] ${resources.metal < 0 ? "text-red-400" : "text-slate-500"}`}>
                    <img src="/assets/metal.webp" className="w-3 h-3 grayscale opacity-50" alt="Metal" /> 0
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsBuildModalOpen(false);
                  window.dispatchEvent(new CustomEvent("spendResources", { detail: { wood: 150, stone: 150, gold: 50, metal: 20 } }));
                  window.dispatchEvent(new CustomEvent("enterBuildMode", { detail: "barracks" }));
                }}
                disabled={resources.wood < 150 || resources.stone < 150 || resources.gold < 50 || resources.metal < 20}
                className="flex flex-col items-center gap-2 p-4 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-600 hover:border-amber-500 disabled:opacity-50 disabled:grayscale"
              >
                <div className="w-16 h-16 bg-slate-900 rounded flex items-center justify-center overflow-hidden border border-slate-700">
                  <img src="/assets/barracks.png" className="w-full h-full object-contain" alt="Barracks" />
                </div>
                <span className="text-sm font-bold text-slate-200">Barracks</span>
                <span className="text-[10px] text-slate-400">10s Build Time</span>
                <span className="text-[10px] text-slate-400">Recruit Soldiers</span>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1 bg-slate-900/50 p-2 rounded border border-slate-700 w-full">
                  <div className={`flex items-center gap-1 text-[10px] ${resources.wood < 150 ? "text-red-400" : "text-green-400"}`}>
                    <img src="/assets/tree.webp" className="w-3 h-3" alt="Wood" /> 150
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] ${resources.stone < 150 ? "text-red-400" : "text-slate-500"}`}>
                    <img src="/assets/stone.webp" className="w-3 h-3" alt="Stone" /> 150
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] ${resources.gold < 50 ? "text-red-400" : "text-green-400"}`}>
                    <img src="/assets/gold.webp" className="w-3 h-3" alt="Gold" /> 50
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] ${resources.metal < 20 ? "text-red-400" : "text-slate-500"}`}>
                    <img src="/assets/metal.webp" className="w-3 h-3" alt="Metal" /> 20
                  </div>
                </div>
              </button>
            </div>
          </div>
        )
      }

      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 flex-none flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-wide">{t.headerTitle}</h1>
          <p className="text-sm text-slate-400">
            {t.headerSubtitle}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => changeLanguage("en")}
            className={`px-3 py-1 rounded border ${language === "en" ? "bg-slate-700 border-slate-500 text-white" : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"}`}
          >
            🇬🇧 EN
          </button>
          <button
            onClick={() => changeLanguage("pl")}
            className={`px-3 py-1 rounded border ${language === "pl" ? "bg-slate-700 border-slate-500 text-white" : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"}`}
          >
            🇵🇱 PL
          </button>
          <button
            onClick={() => changeLanguage("de")}
            className={`px-3 py-1 rounded border ${language === "de" ? "bg-slate-700 border-slate-500 text-white" : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"}`}
          >
            🇩🇪 DE
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 grid gap-6 px-6 py-6 lg:grid-cols-[1fr_320px] overflow-hidden">
        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40 relative group">
          <div className="absolute inset-0">
            <GameCanvas />
          </div>

          {/* Top Bar HUD */}
          <div className="absolute top-4 left-0 right-0 flex justify-center z-10 pointer-events-none">
            <div className="bg-slate-950/90 border-2 border-slate-700 rounded-lg p-2 px-6 flex gap-8 pointer-events-auto shadow-2xl backdrop-blur-md">
              {/* Wood */}
              <div className="flex items-center gap-3">
                <img src="/assets/tree.webp" alt="Wood" className="w-8 h-8 object-contain drop-shadow-md" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Wood</span>
                  <span className="font-mono text-lg font-bold text-green-400 leading-none">{resources.wood}</span>
                </div>
              </div>

              {/* Stone */}
              <div className="flex items-center gap-3">
                <img src="/assets/stone.webp" alt="Stone" className="w-8 h-8 object-contain drop-shadow-md" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Stone</span>
                  <span className="font-mono text-lg font-bold text-gray-300 leading-none">{resources.stone}</span>
                </div>
              </div>

              {/* Gold */}
              <div className="flex items-center gap-3">
                <img src="/assets/gold.webp" alt="Gold" className="w-8 h-8 object-contain drop-shadow-md" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gold</span>
                  <span className="font-mono text-lg font-bold text-amber-400 leading-none">{resources.gold}</span>
                </div>
              </div>

              {/* Metal */}
              <div className="flex items-center gap-3">
                <img src="/assets/metal.webp" alt="Metal" className="w-8 h-8 object-contain drop-shadow-md" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Metal</span>
                  <span className="font-mono text-lg font-bold text-blue-400 leading-none">{resources.metal}</span>
                </div>
              </div>

              {/* Population */}
              <div className="w-px bg-slate-700 mx-2"></div>

              <div className="flex items-center gap-3">
                <img src="/assets/villager.png" alt="Pop" className="w-8 h-8 object-contain drop-shadow-md" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pop</span>
                  <span className={`font-mono text-lg font-bold leading-none ${villagerCount >= maxVillagerCount ? "text-red-400" : "text-green-400"}`}>
                    {villagerCount}/{maxVillagerCount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Build Button */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center z-10 pointer-events-none">
            <button
              onClick={() => setIsBuildModalOpen(true)}
              className="pointer-events-auto bg-slate-900 border-4 border-slate-700 rounded-full w-20 h-20 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-2xl hover:border-amber-500 group"
            >
              <img src="/assets/hammer.png" className="w-10 h-10 object-contain group-hover:rotate-12 transition-transform" alt="Build" />
            </button>
          </div>
        </section>
        <aside className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 overflow-y-auto">
          <div>
            <h2 className="text-lg font-semibold">{t.panelTitle}</h2>
            <p className="text-sm text-slate-400">
              {t.panelSubtitle}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <h3 className="text-sm font-semibold text-slate-200">{t.instructionsTitle}</h3>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              {t.step1}<br />
              {t.step2}<br />
              {t.step3}
            </p>
          </div>
        </aside>
      </main>
    </div >
  );
};

export default App;
