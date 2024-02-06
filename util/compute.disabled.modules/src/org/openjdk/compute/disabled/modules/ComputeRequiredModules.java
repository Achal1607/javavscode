package org.openjdk.compute.disabled.modules;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.netbeans.api.sendopts.CommandException;
import org.netbeans.spi.sendopts.Arg;
import org.netbeans.spi.sendopts.ArgsProcessor;
import org.netbeans.spi.sendopts.Description;
import org.netbeans.spi.sendopts.Env;
import org.openide.*;
import org.openide.modules.Dependency;
import org.openide.modules.ModuleInfo;
import org.openide.util.EditableProperties;
import org.openide.util.Lookup;
import org.openide.util.NbBundle;

public class ComputeRequiredModules implements ArgsProcessor {

    @Override
    public void process(Env env) throws CommandException {
        if (targetProperties != null) {
            try {
                String[] rootModulesLite = {
                    //the basic server:
                    "org.netbeans.modules.java.lsp.server", //the Java LSP Server
                    //support for OSGi modules in nbcode:
                    "org.netbeans.modules.netbinox", //OSGi modules support
                    //dependencies of nbcode.integration:
                    "org.netbeans.modules.project.dependency", //used by nbcode.integration
                    "org.netbeans.modules.updatecenters", //used by nbcode.integration
                    "org.netbeans.swing.laf.flatlaf", //used by nbcode.integration
                    "org.netbeans.core.execution", //used by nbcode.integration, to fulfil org.openide.execution.ExecutionEngine.defaultLookup
                    //additional dependencies needed to make things work:
                    "org.netbeans.modules.autoupdate.cli", //to get --modules option (used by nbcode.ts
                    "org.netbeans.modules.editor", //DocumentFactory
                    "org.netbeans.modules.editor.mimelookup.impl", //so that MimeLookup from layers works
                    "org.netbeans.modules.lexer.nbbridge", //so that lexer(s) work
                    "org.netbeans.modules.java.j2seplatform", //so that JRT FS works
                    "org.netbeans.libs.nbjavacapi", // nbjavac module
                    //58 MB
                    // Used these modules for autocompletion
                    "org.netbeans.modules.editor.autosave",
                    "org.netbeans.modules.editor.bookmarks",
                    "org.netbeans.modules.editor.macros",
                    "org.netbeans.modules.autoupdate.ui",
                    // 58.8 MB
                    // Tests modules
                    "org.netbeans.modules.junit.ui",
                    "org.netbeans.modules.testng.ui",
                    // Debug issue
                    "org.netbeans.modules.masterfs.nio2",
                    "org.netbeans.modules.masterfs.ui"
                };
                String[] rootModulesMaven = {
                    "org.netbeans.modules.maven.hints",
                    "org.netbeans.modules.maven.model",
                    "org.netbeans.modules.maven.indexer.ui",
                    "org.netbeans.modules.maven.junit.ui",
                    "org.netbeans.modules.maven.junit",
                    "org.netbeans.modules.maven.apisupport",
                    "org.netbeans.modules.maven.profiler",
                    "org.netbeans.modules.maven.embedder",
                    "org.netbeans.modules.maven.indexer",
                    "org.netbeans.modules.apisupport.installer.maven",
                    "org.netbeans.api.maven",
                    "org.netbeans.modules.maven.persistence",
                    "org.netbeans.modules.maven",
                    "org.netbeans.modules.maven.htmlui"
                };
                String[] rootModulesGradle = {
                    "org.netbeans.modules.gradle.java",
                    "org.netbeans.modules.gradle.test",
                    "org.netbeans.modules.gradle.editor",
                    "org.netbeans.modules.gradle.dists",
                    "org.netbeans.modules.gradle.persistence"
                };
                Set<String> liteDependencies = computeDependencies(rootModulesLite, "Lite");
                Set<String> mavenDependencies = computeDependencies(rootModulesMaven, "Maven");
                Set<String> gradleDependencies = computeDependencies(rootModulesGradle, "Gradle");

                // Remove modules that are in both maven and gradle extensions, place them in the lite extension as a common place.
                Set<String> modulesToBeInLite = gradleDependencies.stream().filter(cnbb -> mavenDependencies.contains(cnbb)).collect(Collectors.toSet());
                liteDependencies.addAll(modulesToBeInLite);

                // Remove modules from maven and gradle list that are  already present in lite list 
                String enabledModulesInMaven = mavenDependencies.stream().filter(cnbb -> !liteDependencies.contains(cnbb)).collect(Collectors.joining("\n"));
                String enabledModulesInGradle = gradleDependencies.stream().filter(cnbb -> !liteDependencies.contains(cnbb)).collect(Collectors.joining("\n"));

                createAndWriteToFile(enabledModulesInMaven, "modulesToEnableMaven");
                createAndWriteToFile(enabledModulesInGradle, "modulesToEnableGradle");
                createAndWriteToFile(liteDependencies.stream().collect(Collectors.joining("\n")), "modulesToEnableLite");

                // Compute disabled modules
                Map<String, ModuleInfo> allDependencies = getAllDependencies();
                String disabledModules = allDependencies.keySet().stream().filter(cnbb -> !liteDependencies.contains(cnbb)).collect(Collectors.joining(","));
                createAndWriteToFile(disabledModules, "modulesToBeDisabledLite");
                updateDisabledModulesList(disabledModules);

            } catch (IOException ex) {
                throw (CommandException) new CommandException(1).initCause(ex);
            }
        }
        LifecycleManager.getDefault().exit();
    }

    @Arg(longName = "compute-disabled-modules")
    @Description(shortDescription = "#DESC_ComputeDisabledModules")
    @NbBundle.Messages("DESC_ComputeDisabledModules=Compute and set disabled modules")
    public String targetProperties;

    private Map<String, ModuleInfo> getAllDependencies() {
        Map<String, ModuleInfo> codeNameBase2ModuleInfo = new HashMap<>();
        Map<String, Set<String>> capability2Modules = new HashMap<>();
        for (ModuleInfo mi : Lookup.getDefault().lookupAll(ModuleInfo.class)) {
            codeNameBase2ModuleInfo.put(mi.getCodeNameBase(), mi);
            Arrays.asList(mi.getProvides()).forEach(p -> capability2Modules.computeIfAbsent(p, b -> new HashSet<>()).add(mi.getCodeNameBase()));
        }
        return codeNameBase2ModuleInfo;
    }

    private void createAndWriteToFile(String content, String fileName) {
        try {
            String filePath = "/tmp/" + fileName + ".txt";
            File liteFile = new File(filePath);
            liteFile.createNewFile();
            FileWriter myWriter = new FileWriter(filePath);
            myWriter.write(content);
            myWriter.close();
        } catch (IOException ex) {
            System.out.println(ex.toString());
        }
    }

    private void updateDisabledModulesList(String disabledModules) {
        try {
            EditableProperties props = new EditableProperties(false);

            if (Files.isReadable(Paths.get(targetProperties))) {
                try (InputStream in = new FileInputStream(targetProperties)) {
                    props.load(in);
                }
            }

            props.put("disabled.modules", disabledModules);

            try (OutputStream out = new FileOutputStream(targetProperties)) {
                props.store(out);
            }
        } catch (IOException ex) {
            System.out.println(ex.toString());
        }

    }

    private Set<String> computeDependencies(String[] rootModules, String fileName) throws IOException {
        Set<String> rootModulesSet = new HashSet<>(Arrays.asList(rootModules));
        Set<ModuleInfo> todo = new HashSet<>();
        Map<String, ModuleInfo> codeNameBase2ModuleInfo = new HashMap<>();
        Map<String, Set<String>> capability2Modules = new HashMap<>();
        for (ModuleInfo mi : Lookup.getDefault().lookupAll(ModuleInfo.class)) {
            codeNameBase2ModuleInfo.put(mi.getCodeNameBase(), mi);
            Arrays.asList(mi.getProvides()).forEach(p -> capability2Modules.computeIfAbsent(p, b -> new HashSet<>()).add(mi.getCodeNameBase()));
            if (rootModulesSet.contains(mi.getCodeNameBase())) {
                rootModulesSet.remove(mi.getCodeNameBase());
                todo.add(mi);
            }
        }

        if (!rootModulesSet.isEmpty()) {
            throw new IllegalStateException("not found: " + rootModulesSet);
        }

        Set<ModuleInfo> allDependencies = new HashSet<>();
        Set<String> seenNeeds = new HashSet<>();
        Set<String> seenRequires = new HashSet<>();
        Set<String> seenRecommends = new HashSet<>();

        while (!todo.isEmpty()) {
            ModuleInfo currentModule = todo.iterator().next();

            todo.remove(currentModule);

            if (allDependencies.add(currentModule)) {
                for (Dependency d : currentModule.getDependencies()) {
                    switch (d.getType()) {
                        case Dependency.TYPE_MODULE:
                            String depName = d.getName();
                            int slash = depName.indexOf("/");

                            if (slash != (-1)) {
                                depName = depName.substring(0, slash);
                            }

                            ModuleInfo dependency = codeNameBase2ModuleInfo.get(depName);
                            if (dependency == null) {
                                System.err.println("cannot find module: " + depName);
                            } else {
                                todo.add(dependency);
                            }
                            break;
                        case Dependency.TYPE_NEEDS:
                            if (seenNeeds.add(d.getName())) {
                                Set<String> fullfillingModules = capability2Modules.get(d.getName());
                                if (fullfillingModules == null) {
                                    System.err.println("module: " + currentModule.getCodeNameBase() + ", needs capability: '" + d.getName() + "', but there are no modules providing this capability");
                                } else if (fullfillingModules.size() == 1) {
                                    todo.add(codeNameBase2ModuleInfo.get(fullfillingModules.iterator().next()));
                                } else {
                                    System.err.println("module: " + currentModule.getCodeNameBase() + ", needs capability: '" + d.getName() + "', modules that provide that capability are: " + fullfillingModules);
                                }
                            }
                            break;
                        case Dependency.TYPE_REQUIRES:
                            if (seenRequires.add(d.getName())) {
                                Set<String> fullfillingModules = capability2Modules.get(d.getName());
                                if (fullfillingModules == null) {
                                    System.err.println("module: " + currentModule.getCodeNameBase() + ", needs capability: '" + d.getName() + "', but there are no modules providing this capability");
                                } else if (fullfillingModules.size() == 1) {
                                    todo.add(codeNameBase2ModuleInfo.get(fullfillingModules.iterator().next()));
                                } else {
                                    System.err.println("module: " + currentModule.getCodeNameBase() + ", requires capability: '" + d.getName() + "', modules that provide that capability are: " + fullfillingModules);
                                }
                            }
                            break;
                        case Dependency.TYPE_RECOMMENDS:
                            if (seenRecommends.add(d.getName())) {
                                Set<String> fullfillingModules = capability2Modules.get(d.getName());
                                System.err.println("module: " + currentModule.getCodeNameBase() + ", recommends capability: '" + d.getName() + "', modules that provide that capability are: " + fullfillingModules);
                            }
                            break;
                        case Dependency.TYPE_JAVA:
                            break;
                        default:
                            System.err.println("unhandled dependency: " + d);
                    }
                }
            }
        }

        Set<String> requiredCNBBases = allDependencies.stream().map(mi -> mi.getCodeNameBase()).collect(Collectors.toSet());
        createAndWriteToFile(requiredCNBBases.toString().replaceAll(",", "\n"), fileName);

        return requiredCNBBases;
    }

}
