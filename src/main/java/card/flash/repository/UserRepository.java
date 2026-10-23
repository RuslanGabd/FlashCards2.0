package card.flash.repository;

import card.flash.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    @Transactional
    @Modifying(clearAutomatically = true)
    @Query("update User u set u.sessionVersion = u.sessionVersion + 1 where u.username = :username")
    void revokeSessions(String username);
}
